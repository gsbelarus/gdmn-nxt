import { Entity, IEntities, IERModel } from "@gsbelarus/util-api-types";
import { getReadTransaction, releaseReadTransaction } from "../db-connection";
import { loadAtFields, loadAtRelationFields, loadAtRelations } from "./at-utils";
import gdbaseRaw from "./gdbase.json";
import { loadRDBFields, loadRDBRelationFields, loadRDBRelations } from "./rdb-utils";

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

export const importERModel = async () => {
  const t = new Date().getTime();
  const { attachment, transaction } = await getReadTransaction('rdb');
  try {
    const [f, r, rf, af, ar, arf] = await Promise.all([
      loadRDBFields(attachment, transaction), 
      loadRDBRelations(attachment, transaction),
      loadRDBRelationFields(attachment, transaction),
      loadAtFields(attachment, transaction),
      loadAtRelations(attachment, transaction),
      loadAtRelationFields(attachment, transaction),
    ]);

    const gdbase = gdbaseRaw as IgdbaseImport;
    const entities: IEntities = {};

    const importGdbase = (g: IgdbaseImport, parent?: string) => {
      const e: Entity = {
        parent,
        name: g.className,
        abstract: g.abstract,
        attributes: [],
        adapter: 
          g.listTable ? { 
            relation: { name: g.listTable.name, alias: 'z' } 
          } : undefined
      };

      entities[e.name] = e;

      if (g.children) {
        for (const ch of g.children) {
          importGdbase(ch, g.className);
        }
      }
    };

    importGdbase(gdbase);

    console.log(`ERModel imported in ${new Date().getTime() - t}ms`);

    return { entities } as IERModel;
  } finally {
    releaseReadTransaction('rdb');
  }  
};