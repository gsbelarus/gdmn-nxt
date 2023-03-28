export type FieldDataType = 'date' | 'timestamp' | 'curr' | 'boolean' | 'array';

export interface IFieldSchema {
  type: FieldDataType;
}

export interface ITableSchema {
  [fldName: string]: IFieldSchema;
};

export interface IDataSchema {
  [tableName: string]: ITableSchema;
};

export interface IQuery {
  name: string;
  query: string;
  params: any[];
};

export interface IDataRecord {
  [fldName: string]: any;
};

export interface IResults {
  [queryName: string]: IDataRecord[];
};

export interface IRequestResult<R = IResults> {
  queries: R,
  _schema: IDataSchema;
  _params?: [IDataRecord];
};

export interface IWithID {
  ID: number;
};

export interface IWithRUID {
  RUID: string;
};

export interface IWithParent {
  PARENT?: number;
};

export interface IBaseContact {
  NAME: string;
  PHONE?: string;
  EMAIL?: string;
  FOLDERNAME?: string;
  NOTE?: string;
  ADDRESS?: string;
  FAX?: string;
};

export interface IContactWithID extends IBaseContact, IWithID, IWithParent {}

export interface ICompany extends IBaseContact {
  FULLNAME: string;
};

export interface IAccount {
  USR$FIRSTNAME: string;
  USR$LASTNAME: string;
  USR$POSITION?: string;
  USR$EXPIREON?: Date;
  USR$APPROVED?: boolean;
  USR$PHONE?: string;
  USR$EMAIL: string;
  USR$COMPANYKEY?: number;
  USR$HASH: string;
  USR$SALT: string;
};

export type IAccountWithID = IAccount & IWithID;

export interface IContactHierarchy {
  ID: number,
  PARENT?: number;
  LB: number;
  RB: number;
  NAME: string
}
export interface IResultError {
  errorMessage: string
};

export type IEmployee = IContactWithID;

export interface IProfileSettings {
  AVATAR?: string | null;
  RANK?: string;
  COLORMODE?: ColorMode;
  DEALSFILTER: number;
}

export enum ColorMode {
  Light = 'light',
  Dark = 'dark',
}

export type GedeminUser = {
  id: number;
  userName: string;
  contactkey: number;
  rank?: string;
  colorMode?: ColorMode,
  dealsFilter: number
}
