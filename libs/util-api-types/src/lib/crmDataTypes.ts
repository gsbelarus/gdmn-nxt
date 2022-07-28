/**
 *  These types are intended for use in the CRM web and back server.
 */

import { IRequestResult } from '..';
import { IContactWithID, IDataRecord, IWithID } from './commonDataTypes';

export interface IReconciliationStatement {
  customerDebt: IDataRecord[];
  customerAct: IDataRecord[];
  contact: IDataRecord[];
  saldo: IDataRecord[];
  movement: IDataRecord[];
  payment: IDataRecord[];
  firm: IDataRecord[];
};

export type IReconciliationStatementRequestResult = IRequestResult<IReconciliationStatement>;

export interface ILabelsContact extends IWithID {
  USR$CONTACTKEY: number;
  USR$LABELKEY: number;
};

export interface IContactWithLabels extends IContactWithID {
  labels?: ILabelsContact[]
};

export interface IContractJob extends IContactWithID {
  USR$NAME?: string;
};

export interface ICustomer extends IContactWithID {
  // LABELS?: ILabelsContact[];
  LABELS?: ILabel[];
  CONTRACTS?: IContractJob[];
  DEPARTMETNS?: IContactWithID[];
  TAXID?: string;
};

export interface ICustomerContract {
  USR$NUMBER: string;
  USR$NAME: string;
  USR$DATEBEGIN: Date;
  USR$DATEEND: Date;
};

export type ICustomerContractWithID = ICustomerContract & IWithID;

export interface IDeal extends IWithID {
  USR$NAME?: string;
  USR$AMOUNT?: number;
  CONTACT?: IContactWithID;
  PERFORMER?: IContactWithID;
  CREATOR?: IContactWithID;
  USR$SOURCE?: string;
  USR$DEADLINE?: Date;
  USR$CONTACTKEY?: number;
  USR$DISABLED?: boolean;
  USR$DONE?: boolean;
  USR$READYTOWORK?: boolean;
};

export interface IKanbanCard extends IWithID {
  USR$INDEX: number;
  USR$MASTERKEY: number;
  USR$DEALKEY?: number;
  DEAL?: IDeal;
  TASKS?: IKanbanTask[];
};

export interface IKanbanColumn extends IWithID {
  USR$INDEX: number;
  USR$NAME: string;
  CARDS: IKanbanCard[];
};

export interface IKanbanHistory extends IWithID {
  USR$DATE?: Date;
  USR$TYPE: string;
  USR$DESCRIPTION: string;
  USR$OLD_VALUE: string;
  USR$NEW_VALUE: string;
  USR$USERKEY: number;
  USR$CARDKEY: number,
  USERNAME?: string;
};

export interface IKanbanTask extends IWithID {
  USR$NAME: string;
  USR$DEADLINE?: Date;
  PERFORMER?: IContactWithID;
  CREATOR: IContactWithID;
  USR$DATECLOSE?: Date;
  USR$CREATIONDATE?: Date;
  USR$CARDKEY: number;
  USR$CLOSED: boolean;
};

export interface IActCompletion extends IWithID {
  NUMBER: string;
  DOCUMENTDATE: Date;
  DEPT_NAME: string;
  JOB_NUMBER: string;
  USR$SUMNCU: number;
};

export interface IBankStatement extends IWithID {
  NUMBER: string;
  DOCUMENTDATE: Date;
  DEPT_NAME: string;
  JOB_NUMBER: string;
  CSUMNCU: number;
  COMMENT: string;
};

export interface IChartSumByperiod {
  ONDATE: Date;
  AMOUNT: number;
};

export interface IPhone extends IWithID {
  USR$CONTACTKEY?: number;
  USR$PHONENUMBER: string;
}
export interface IContactPerson extends IContactWithID {
  USR$BG_OTDEL?: IContactWithID;
  PHONES?: IPhone[];
  RANK?: string;
  USR$LETTER_OF_AUTHORITY?: string;
  WCOMPANYKEY?: number;
};

export interface IContactsList extends IWithID {
  NUMBER: string;
  DOCUMENTDATE: Date;
  DEPT_NAME: string;
  JOB_NUMBER: string;
  SUMNCU: number;
  SUMCURNCU: number;
  ISACTIVE: boolean;
  ISBUDGET: boolean;
  DATEBEGIN: Date;
  DATEEND: Date;
};

export interface IWorkType extends IWithID {
  USR$NAME: string;
  USR$CONTRACTJOBKEY: number;
};

export interface ILabel extends IWithID {
  USR$NAME: string;
  USR$COLOR?: string;
  USR$DESCRIPTION?: string;
};
