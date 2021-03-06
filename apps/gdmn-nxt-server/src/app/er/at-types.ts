export interface IAtField {
  FIELDNAME: string;
  LNAME: string;
  DESCRIPTION: string; 
  REFTABLE: string | null;
  REFLISTFIELD: string | null;
  REFCONDITION: string | null;
  SETTABLE: string | null;
  SETLISTFIELD: string | null;
  SETCONDITION: string | null;
  ALIGNMENT: string | null;
  FORMAT: string | null;
  VISIBLE: number;
  COLWIDTH: number;
  READONLY: number | null;
  GDCLASSNAME: string | null;
  GDSUBTYPE: string | null;
  NUMERATION: string | object | null;
};

export interface IAtFields {
  [FIELDNAME: string]: IAtField;
};

export interface IAtRelation {
  RELATIONNAME: string; 
  LNAME: string; 
  LSHORTNAME: string;
  DESCRIPTION: string;
  LISTFIELD: string | null; 
  EXTENDEDFIELDS: string | null; 
  SEMCATEGORY: string | null; 
  GENERATORNAME: string | null; 
};

export interface IAtRelations {
  [RELATIONNAME: string]: IAtRelation;
};

export interface IAtRelationField {
  FIELDNAME: string;
  RELATIONNAME: string; 
  FIELDSOURCE: string; 
  CROSSTABLE: string | null; 
  CROSSFIELD: string | null; 
  LNAME: string;
  LSHORTNAME: string; 
  DESCRIPTION: string; 
  VISIBLE: number | null; 
  FORMAT: string | null; 
  ALIGNMENT: string | null; 
  COLWIDTH: number | null; 
  READONLY: number | null; 
  GDCLASSNAME: string | null; 
  GDSUBTYPE: string | null; 
  DELETERULE: string | null;
  SEMCATEGORY: string | null;
  REF: string | null;
};

export interface IAtRelationFields {
  [RELATIONNAME: string]: IAtRelationField[];
};

export interface IGedeminDocType {
  ID: number; 
  PARENT: number | null;
  LB: number;
  RB: number; 
  NAME: string; 
  DESCRIPTION: string; 
  CLASSNAME: string | null; 
  DOCUMENTTYPE: string | null; 
  RUID: string;  
  HEADERRELNAME: string;  
  LINERELNAME: string | null;  
};

export interface IAtModel {
  atFields: IAtFields;
  atRelations: IAtRelations;
  atRelationFields: IAtRelationFields;
  gdDocumentType: IGedeminDocType[];
};