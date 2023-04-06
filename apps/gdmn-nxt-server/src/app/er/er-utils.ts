import { Expression, Entity, IEntities, IERModel, Operand, IDomains, Domain, IDomainBase, Attr, IAttrBase, IEntitySetAttr, IEntityAttr, ICrossAttrAdapter, isSeqAttr } from "@gsbelarus/util-api-types";
import { writeFile } from "fs/promises";
import { getReadTransaction, releaseReadTransaction } from "../utils/db-connection";
import { IAtRelation, IGedeminDocType } from "./at-types";
import { loadAtFields, loadAtRelationFields, loadAtRelations, loadGdDocumentType, adjustRelationName } from "./at-utils";
//import gdbaseRaw from "./gdbase.json";
import entitiesRaw from "./entities.json";
import { loadRDBFields } from "./rdb-utils";
import { tmpdir } from "os";
import { join } from "path";

/*
We import er model of the existing Gedemin database in following order:
1. Import built-in entities from gdbase.json file.
2. Import simple entities for USR$ tables from the database.
3. Import user defined document entities from the database.
4. Import domains.
5. Import attributes for entities which has been imported at steps 1-3.
*/

const adjustValidation = (s: string | null) => {
  if (s) {
    const exp = /CHECK\s*\(\s*(.+)\s*\)/ig;
    const res = exp.exec(s);
    if (res) {
      return res[1];
    }
  }

  return undefined;
};

const str2cond = (s: string): (Expression | undefined) => {

  const extractOperand = (s: string): (Operand | Expression) => {
    const expPlus = /(\w+)\s*\+\s*((-{0,1}\d+)|('(.*)'))/ig;
    let res = expPlus.exec(s);

    if (res) {
      return {
        operator: '+',
        left: {
          type: 'FIELD',
          alias: 'z',
          fieldName: res[1]
        },
        right: {
          type: 'VALUE',
          value: res[3] ? Number(res[3]) : res[5]
        }
      }
    } else {
      return {
        type: 'FIELD',
        alias: 'z',
        fieldName: s
      };
    }
  };

  // logical expressions with AND
  const expAnd = /((.+|.+\))\s*)AND(\s*(\(.+|.+))/ig;
  let res = expAnd.exec(s);

  if (res) {
    const left = str2cond(res[2]);
    const right = str2cond(res[4]);
    if (left && right) {
      return {
        operator: 'AND',
        left,
        right
      };
    }
  }

  s = s.trim();

  if (s.charAt(0) === '(' && s.charAt(s.length - 1) === ')') {
    s = s.slice(1, s.length - 1).trim();
  }

  // expressions of equation
  // z.field_name = <NUMBER>
  // z.field_name = <QUOTED STRING>
  const expEqValue = /z\.(\w+)\s*=\s*((-{0,1}\d+)|'(.*)')/ig;
  res = expEqValue.exec(s);

  if (res) {
    return {
      operator: 'EQ',
      left: {
        type: 'FIELD',
        alias: 'z',
        fieldName: res[1]
      },
      right: {
        type: 'VALUE',
        value: res[3] ? Number(res[3]) : res[4]
      }
    };
  }

  // expressions with IN, NOT IN operators
  // tested set is defined as constants list
  // or result of a query
  const expInValue = /z\.(\w+)\s+(IN|NOT\s+IN)\s*\(\s*(.+)\s*\)/ig;
  res = expInValue.exec(s);

  if (res) {
    if (res[3].slice(0, 7).toUpperCase() === 'SELECT ') {
      return {
        operator: res[2].toUpperCase() === 'IN' ? 'IN' : 'NOT IN',
        left: {
          type: 'FIELD',
          alias: 'z',
          fieldName: res[1]
        },
        right: {
          type: 'QUERY',
          query: res[3]
        }
      };
    } else {
      const arr = res[3].split(',').map( i => i.trim() );
      let values;

      if (arr[0].charAt(0) === "'") {
        values = arr.map( i => i.slice(1, i.length - 1) );
      } else {
        values = arr.map( i => Number(i) );
      };

      return {
        operator: res[2].toUpperCase() === 'IN' ? 'IN' : 'NOT IN',
        left: {
          type: 'FIELD',
          alias: 'z',
          fieldName: res[1]
        },
        right: {
          type: 'LIST',
          values
        }
      };
    }
  }

  // expressions with EXISTS
  const expExists = /EXISTS\s*\((.+)\)/ig;
  res = expExists.exec(s);

  if (res) {
    return {
      operator: 'EXISTS',
      right: {
        type: 'QUERY',
        query: res[1]
      }
    };
  }

  const expLikeValue = /z\.(\w+)\s+LIKE\s+'(.+)'/ig;
  res = expLikeValue.exec(s);

  if (res) {
    return {
      operator: 'LIKE',
      left: {
        type: 'FIELD',
        alias: 'z',
        fieldName: res[1]
      },
      right: {
        type: 'VALUE',
        value: res[2]
      }
    };
  }

  // expressions IS NULL, IS NOT NULL
  const expIsNULL = /z\.(.+)\s+((IS\s+NOT)|(IS))\s+NULL/ig;
  res = expIsNULL.exec(s);

  if (res) {
    if (res[3]) {
      return {
        operator: 'IS NOT NULL',
        left: {
          type: 'FIELD',
          alias: 'z',
          fieldName: res[1]
        },
      };
    } else {
      return {
        operator: 'IS NULL',
        left: extractOperand(res[1])
      };
    }
  }

  console.warn(`unknown condition ${s}`);
  return undefined;
};

interface IgdbaseImport {
  className: string;
  subType?: string;
  abstract?: boolean;
  displayName?: string;
  listTable?: { name: string; pk?: string };
  distinctRelation?: { name: string; pk?: string };
  restrictCondition?: string;
  semCategory?: string;
  children?: IgdbaseImport[];
};

/**
 * Returns score of conformity between given entity and a table.
 * For list table score is 0, and for tables in joins sequence
 * the score is > 0, and the deeper the table lays in the joins
 * the higher the score. If the table doesn't belong to the entity
 * -1 is returned.
 * @param e
 * @param refTable
 * @returns
 */
const getEntityScore = (e: Entity, refTable: string) => {
  const joinScore = e.adapter?.join?.reverse().findIndex( j => j.name === refTable );

  if (joinScore >= 0) {
    return 1000 - joinScore;
  }

  return e.adapter?.name === refTable ? 0 : -1;
};

const extractNumDef = (s: string | null | undefined) => {
  if (!s) {
    return undefined;
  }

  const numDef = /DEFAULT\s+(('(.+)')|(.+))/ig;
  const res = numDef.exec(s);
  const num = Number(res[3]?.trim() ?? res[4]?.trim());

  if (isNaN(num)) {
    return undefined;
  }

  return num;
};

const extractBooleanDef = (s: string | null | undefined) => {
  if (!s) {
    return undefined;
  }

  const booleanDef = /DEFAULT\s+(('(.+)')|(.+))/ig;
  const res = booleanDef.exec(s);
  return Boolean(res[3]?.trim() ?? res[4]?.trim());
};

export const importModels = async () => {
  const t = new Date().getTime();
  const { attachment, transaction, fullDbName } = await getReadTransaction('rdb');
  try {
    const [
      rdbFields,
      atFields,
      atRelations,
      atRelationFields,
      gdDocumentType
    ] = await Promise.all([
      loadRDBFields(attachment, transaction),
      loadAtFields(attachment, transaction),
      loadAtRelations(attachment, transaction),
      loadAtRelationFields(attachment, transaction),
      loadGdDocumentType(attachment, transaction),
    ]);

    const entities = entitiesRaw as IEntities;

    /*
    The code below is for importing standard Gedemin classes
    from the predefined json file. This format was used in
    previous GDMN platform. We converted it into current format
    and stored as entities.json.
    const relation2class = {} as { [relation: string]: string };
    const gdbase = gdbaseRaw as IgdbaseImport;
    const importGdbase = (g: IgdbaseImport, depth = 0, parent?: Entity) => {
      const rdbRelation = g.listTable ? rdbRelations[g.listTable.name] : undefined;
      const atRelation = rdbRelation ? atRelations[rdbRelation.RDB$RELATION_NAME] : undefined;
      let adapter: IEntityAdapter;
      if (g.listTable) {
        adapter = {
          name: g.listTable.name,
          alias: 'z'
        };
        if (parent?.adapter?.join) {
          adapter.join = [...parent.adapter.join];
        }
        if (g.distinctRelation) {
          relation2class[g.distinctRelation.name] = g.className;
          const j = {
            type: 'INNER',
            name: g.distinctRelation.name,
            alias: `z${depth}`
          } as IJoinAdapter;
          if (adapter.join) {
            adapter.join.push(j);
          } else {
            adapter.join = [j];
          }
          //ugly hack
          if (g.distinctRelation.name === 'GD_COMPANY') {
            adapter.join.push({
              type: 'LEFT',
              name: 'GD_COMPANYCODE',
              alias: 'cc'
            });
          }
        } else {
          relation2class[g.listTable.name] = g.className;
        }
        if (g.restrictCondition) {
          adapter.condition = str2cond(g.restrictCondition);
        }
      };
      const e: Entity = {
        type: g.listTable?.name === 'GD_DOCUMENT' ? 'DOCUMENT' : 'SIMPLE',
        parent: parent?.name,
        name: g.className,
        abstract: g.abstract,
        attributes: [],
        semCategory: atRelation?.SEMCATEGORY ?? undefined,
        adapter
      };
      entities[e.name] = e;
      if (g.children) {
        for (const ch of g.children) {
          importGdbase(ch, g.abstract ? 1 : (depth + 1), e);
        }
      }
    };
    importGdbase(gdbase);
    writeFileSync('c:/temp/entities.json', JSON.stringify(entities, undefined, 2));
    */

    const usrRelations = Object.values(atRelations).filter( r => r.RELATIONNAME.startsWith('USR$') );

    for (const usrRelation of usrRelations) {
      const arf = atRelationFields[usrRelation.RELATIONNAME];

      if (!arf) {
        console.warn(`Unknown relation ${usrRelation.RELATIONNAME}...`);
        continue;
      }

      if (arf.find( f => f.FIELDNAME === 'ID')) {
        const parent = arf.find( f => f.FIELDNAME === 'LB') ?
          entities['TgdcAttrUserDefinedLBRBTree']
          : arf.find( f => f.FIELDNAME === 'PARENT') ?
          entities['TgdcAttrUserDefinedTree']
          :
          entities['TgdcAttrUserDefined'];

        if (parent) {
          // make name looks the same way as in the Gedemin
          const name = parent.name + adjustRelationName(usrRelation.RELATIONNAME);

          entities[name] = {
            type: 'SIMPLE',
            parent: parent.name,
            name,
            lName: usrRelation.LNAME ?? usrRelation.LSHORTNAME,
            attributes: [],
            semCategory: usrRelation.SEMCATEGORY ?? undefined,
            adapter: {
              name: usrRelation.RELATIONNAME,
              alias: 'z'
            }
          };
        }
      }
    }

    const dtMap = {
      TgdcDocumentType: [entities['TgdcDocument'], undefined],
      TgdcUserDocumentType: [entities['TgdcUserDocument'], entities['TgdcUserDocumentLine']],
      TgdcInvDocumentType: [entities['TgdcInvDocument'], entities['TgdcInvDocumentLine']],
      TgdcInvPriceListType: [entities['TgdcInvPriceList'], entities['TgdcInvPriceListLine']]
    };

    const createDocEntity = (parentEntities: [Entity, Entity | undefined], documentType: IGedeminDocType) => {
      const hr = atRelations[documentType.HEADERRELNAME];

      if (!parentEntities[0] && !parentEntities[1]) {
        return;
      }

      if (!hr) {
        console.warn(`Unknown document relation ${documentType.HEADERRELNAME}`);
        return;
      }

      const crEnt = (parent: string, r: IAtRelation) => {
        const name = parent + documentType.RUID;
        entities[name] = {
          type: 'DOCUMENT',
          parent,
          name,
          lName: documentType.NAME ?? undefined,
          attributes: [],
          semCategory: r.SEMCATEGORY ?? undefined,
          adapter: {
            name: 'GD_DOCUMENT',
            alias: 'z',
            join: [{
              type: 'INNER',
              name: r.RELATIONNAME,
              alias: 'z1'
            }]
          }
        };
      };

      crEnt(parentEntities[0].name, hr);

      const lr = documentType.LINERELNAME && atRelations[documentType.LINERELNAME];

      if (lr && parentEntities[1]) {
        crEnt(parentEntities[1].name, lr);
      }
    };



    for (const documentType of gdDocumentType) {
      if (documentType.DOCUMENTTYPE === 'D' && documentType.HEADERRELNAME) {
        createDocEntity(dtMap[documentType.CLASSNAME || 'TgdcDocumentType'], documentType);
      }
    };

    const domains: IDomains = {};

    for (const atField of Object.values(atFields)) {
      const {
        FIELDNAME, LNAME, READONLY, VISIBLE,
        REFTABLE, REFLISTFIELD, REFCONDITION,
        SETTABLE, SETLISTFIELD, SETCONDITION,
        GDCLASSNAME, GDSUBTYPE, NUMERATION
      } = atField;

      let relation: string, listField: string, condition: string;

      if (REFTABLE) {
        relation = REFTABLE;
        listField = REFLISTFIELD ?? undefined;
        condition = REFCONDITION ?? undefined;
      } else if (SETTABLE) {
        relation = SETTABLE;
        listField = SETLISTFIELD ?? undefined;
        condition = SETCONDITION ?? undefined;
      }

      if (relation) {
        let entityName;

        if (GDCLASSNAME) {
          const fullGdcClassName = `${GDCLASSNAME}${GDSUBTYPE ? ('\\' + GDSUBTYPE) : ''}`;
          entityName = entities[fullGdcClassName]?.name;
        }

        if (!entityName) {
          const found = Object.values(entities).filter( e =>
            // can't restrict on INNER joins only because of presence
            // of references to GD_COMPANYCODE relation
            // which is weak relation for TgdcCompany class
            e.adapter?.join?.find( j => j.name === relation )
            ||
            e.adapter?.name === relation
          );

          if (found.length === 1) {
            entityName = found[0].name;
          }
          else if (found.length) {
            const sorted = found
              .map( e => ({ e, score: getEntityScore(e, relation) }) )
              .sort( (a, b) => b.score - a.score );

            if (sorted[0].score > sorted[1].score) {
              entityName = sorted[0].e.name;
            } else {
              const getEntityDepth = (e: Entity) => e.parent ? (getEntityDepth(entities[e.parent]) + 1) : 0;
              const top = sorted
                .filter( t => t.score === sorted[0].score )
                .sort( (a, b) => getEntityDepth(b.e) - getEntityDepth(a.e) );
              entityName = top[0].e.name;
            }
          }
        }

        if (entityName) {
          domains[FIELDNAME] = {
            name: FIELDNAME,
            lName: LNAME,
            type: REFTABLE ? 'ENTITY' : 'ENTITY[]',
            entityName,
            visible: VISIBLE ? true : undefined,
            readonly: READONLY ? true : undefined,
            adapter: {
              name: FIELDNAME,
              relation,
              listField,
              condition
            }
          };
        } else {
          console.warn(`Can't create domain ${FIELDNAME}. No entity for table ${relation} found.`,
            'If it is a document table check that it is referenced in GD_DOCUMENTTYPE.',
            'INTEGER domain will be created as a substitute...');
          domains[FIELDNAME] = {
            name: FIELDNAME,
            lName: LNAME,
            type: 'INTEGER',
            max: Number.MAX_SAFE_INTEGER,
            min: 0,
            visible: VISIBLE ? true : undefined,
            readonly: READONLY ? true : undefined,
            adapter: {
              name: FIELDNAME
            }
          };
        }
      } else {
        const rdbField = rdbFields[FIELDNAME];

        if (!rdbField) {
          console.warn(`Unknown domain ${FIELDNAME}`);
        } else {
          const domainBase: IDomainBase = {
            name: FIELDNAME,
            lName: LNAME,
            visible: VISIBLE ? true : undefined,
            readonly: READONLY ? true : undefined,
            required: rdbField.RDB$NULL_FLAG ? true : undefined,
            validationSource: adjustValidation(rdbField.RDB$VALIDATION_SOURCE),
            adapter: {
              name: rdbField.RDB$FIELD_NAME
            }
          };

          let domain: Domain;

          if (rdbField.RDB$FIELD_PRECISION) {
            domain = {
              ...domainBase,
              type: 'NUMERIC',
              max: Number.MAX_SAFE_INTEGER,
              min: Number.MIN_SAFE_INTEGER,
              precision: rdbField.RDB$FIELD_PRECISION,
              scale: rdbField.RDB$FIELD_SCALE,
              default: extractNumDef(rdbField.RDB$DEFAULT_SOURCE)
            };
          } else if (NUMERATION) {
            domain = {
              ...domainBase,
              type: 'ENUM',
              numeration: typeof NUMERATION === 'string' ? NUMERATION : ''
            };
          } else {
            switch (rdbField.RDB$FIELD_TYPE) {
              case 8:
                domain = {
                  ...domainBase,
                  type: 'INTEGER',
                  max: 2_147_483_647,
                  min: -2_147_483_648,
                  default: extractNumDef(rdbField.RDB$DEFAULT_SOURCE)
                };
                break;

              case 7:
                domain = {
                  ...domainBase,
                  type: 'INTEGER',
                  max: 32_767,
                  min: -32_768,
                  default: extractNumDef(rdbField.RDB$DEFAULT_SOURCE)
                };
                break;

              case 10:
                domain = {
                  ...domainBase,
                  type: 'DOUBLE',
                  max: Number.MAX_VALUE,
                  min: Number.MIN_VALUE,
                  default: extractNumDef(rdbField.RDB$DEFAULT_SOURCE)
                };
                break;

              case 12:
                domain = {
                  ...domainBase,
                  type: 'DATE',
                  default: rdbField.RDB$DEFAULT_SOURCE ?? undefined
                };
                break;

              case 13:
                domain = {
                  ...domainBase,
                  type: 'TIME',
                  default: rdbField.RDB$DEFAULT_SOURCE ?? undefined
                };
                break;

              case 14:
              case 37:
                domain = {
                  ...domainBase,
                  type: 'STRING',
                  maxLen: rdbField.RDB$CHARACTER_LENGTH ?? rdbField.RDB$FIELD_LENGTH,
                  charSetId: rdbField.RDB$CHARACTER_SET_ID,
                  default: rdbField.RDB$DEFAULT_SOURCE ?? undefined
                };
                break;

              case 16:
                domain = {
                  ...domainBase,
                  type: 'BIGINT',
                  max: Number.MAX_SAFE_INTEGER, //TODO: need changing to BigInt class
                  min: Number.MIN_SAFE_INTEGER,
                  default: extractNumDef(rdbField.RDB$DEFAULT_SOURCE)
                };
                break;

              case 27:
                domain = {
                  ...domainBase,
                  type: 'DOUBLE',
                  max: Number.MAX_VALUE,
                  min: Number.MIN_VALUE,
                  default: extractNumDef(rdbField.RDB$DEFAULT_SOURCE)
                };
                break;

              case 35:
                domain = {
                  ...domainBase,
                  type: 'TIMESTAMP',
                  default: rdbField.RDB$DEFAULT_SOURCE ?? undefined
                };
                break;

              case 23:
                domain = {
                  ...domainBase,
                  type: 'BOOLEAN',
                  default: extractBooleanDef(rdbField.RDB$DEFAULT_SOURCE) ?? undefined
                };
                break;

              //TODO: treat text BLOBs as strings?
              case 261:
                domain = {
                  ...domainBase,
                  type: 'BLOB',
                  subType: rdbField.RDB$FIELD_SUB_TYPE
                };
                break;

              default:
                console.warn(`Unknown field type ${rdbField.RDB$FIELD_TYPE} for domain ${FIELDNAME}`);
            }
          }

          if (domain) {
            domains[FIELDNAME] = domain;
          }
        }
      }
    }

    const entitiesArr = Object.values(entities);
    const relation2entityNameCache: { [relation: string]: string } = {};

    const relation2entityName = (r: string | null) => {
      const found = r && relation2entityNameCache[r];

      if (found) {
        return found;
      }

      const candidates = entitiesArr
        .map<[number, string] | undefined>( ({ name, adapter }) => {
          if (!adapter) {
            return undefined;
          }

          if (adapter.name === r) {
            return [0, name]
          }

          const idx = adapter.join?.reverse().findIndex( j => j.name === r );

          if (idx >= 0) {
            return [1000 - idx, name];
          }

          return undefined;
        })
        .filter(Boolean)
        .sort( (a, b) => b[0] - a[0] );

      if (candidates.length) {
        //console.log(`${r} ----> ${JSON.stringify(candidates)}`)
        return relation2entityNameCache[r] = candidates[0][1];
      }

      return undefined;
    };

    // don't want see the same warning multiple times
    let prevWarning = '';

    for (const entity of entitiesArr) {
      if (entity.abstract) {
        continue;
      }

      if (!entity.adapter) {
        // console.warn(`No adapter for entity ${entity.name} found`);
        continue;
      }

      const entityRelations = [[entity.adapter.name, '']];

      if (entity.adapter.join) {
        entityRelations.push(...entity.adapter.join.map(j => ([j.name, j.type])));
      }

      for (const [relation, joinType] of entityRelations) {
        const arf = atRelationFields[relation];

        if (!arf) {
          // console.warn(`No fields definitions for ${entity.adapter.name} found...`);
          continue;
        }

        for (const fld of arf) {
          const domain = domains[fld.FIELDSOURCE];

          if (!domain) {
            console.warn(`Domain ${fld.FIELDSOURCE} has not been found for the field ${entity.adapter.name}.${fld.FIELDNAME}`);
            continue;
          }

          const createAttr = (entity?: string, crossAdapter?: Omit<ICrossAttrAdapter, 'name'>): (IAttrBase | IEntityAttr | IEntitySetAttr) => ({
            name: fld.FIELDNAME,
            domain: domain.name,
            lName: fld.LNAME,
            entityName: entity,
            /* weak relationship */
            required: joinType === 'LEFT' ? false : undefined,
            readonly: fld.READONLY ? true : undefined,
            visible: fld.VISIBLE ? true : undefined,
            semCategory: fld.SEMCATEGORY ?? undefined,
            adapter: {
              relation: joinType ? relation : undefined,
              name: fld.FIELDNAME,
              ...crossAdapter
            }
          });

          if (
            domain.type === 'ENTITY'
            ||
            domain.type === 'ENTITY[]'
            ||
            fld.GDCLASSNAME
            ||
            fld.REF
          ) {
            const refEntityName = fld.GDCLASSNAME
              ? (fld.GDCLASSNAME + adjustRelationName(fld.GDSUBTYPE))
              : domain.type === 'ENTITY' || domain.type === 'ENTITY[]'
              ? domain.entityName
              : relation2entityName(fld.REF);
            const refEntity = refEntityName && entities[refEntityName];

            if (!refEntity) {
              const warning = `There is no corresponding entity for ${fld.RELATIONNAME}.${fld.FIELDNAME}...`;
              // if (warning !== prevWarning) {
              //   console.warn(prevWarning = warning);
              // }
              continue;
            }

            if (fld.CROSSTABLE) {
              entity.attributes.push(createAttr(refEntity.name, {
                crossRelation: fld.CROSSTABLE,
                crossField: fld.CROSSFIELD
              }));
            } else {
              entity.attributes.push(createAttr(refEntity.name));
            }
          } else {
            if (fld.FIELDNAME === 'ID') {
              entity.attributes.push({
                type: 'SEQ',
                name: 'ID'
              });
            } else {
              entity.attributes.push(createAttr());
            }
          }
        }
      }
    }

    const erModel: IERModel = {
      fullDbName,
      domains,
      entities
    };

    const dumpErModel = JSON.stringify(erModel, undefined, 2);

    // console.log(`
    //   ERModel imported in ${new Date().getTime() - t} ms
    //   size of erModel: ${(new TextEncoder().encode(dumpErModel)).length} bytes
    //   domains: ${Object.keys(domains).length}
    //   entities: ${Object.keys(entities).length}
    //   attributes: ${Object.values(entities).flatMap( e => e.attributes ).length}
    // `);

    const stripAdapter = (attr: Attr) => {
      if (isSeqAttr(attr)) {
        return attr;
      } else {
        const { adapter, ...rest } = attr;
        return rest;
      }
    };

    const erModelNoAdapters: IERModel = {
      ...erModel,
      domains: Object.fromEntries(
        Object.entries(erModel.domains).map(
          ([name, { adapter, ...rest }]) => ([name, rest])
        )
      ),
      entities: Object.fromEntries(
        Object.entries(erModel.entities).map(
          ([name, { adapter, attributes, ...rest }]) => ([name, {
            ...rest,
            attributes: attributes.map( stripAdapter ),
          }])
        )
      ),
    };

    const dumpFileName = join(tmpdir(),'erModel.json');
    writeFile(dumpFileName, dumpErModel, { encoding: 'utf8' })
      .then( () => console.log(`ERModel dumped to ${dumpFileName}...`) )
      .catch( e => console.error(e) );

    return {
      rdbModel: {
        rdbFields
      },
      atModel: {
        atFields,
        atRelations,
        atRelationFields,
        gdDocumentType
      },
      erModel,
      /** erModel stripped of adapters as they are not needed on the client */
      erModelNoAdapters
    };
  } finally {
    releaseReadTransaction('rdb');
  }
};
