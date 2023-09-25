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
  LABELS?: ILabel[];
  CONTRACTS?: ICustomerContractWithID[];
  JOBWORKS?: IWorkType[];
  DEPARTMENTS?: IContactWithID[];
  TAXID?: string;
  FULLNAME?: string;
  POSTADDRESS?: string;
  BUSINESSPROCESSES?: IBusinessProcess[];
};

interface IMapOfArrays {
  [key: string]: any[];
};

export interface ICustomerCross {
  departments: IMapOfArrays,
  contracts: IMapOfArrays,
  jobWorks: IMapOfArrays,
  persons: IMapOfArrays,
  // businessProcesses: IMapOfArrays,
};

export interface ICustomerContract extends IWithID {
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
  PERFORMERS?: IContactWithID[];
  CREATOR?: IContactWithID;
  SOURCE?: IDealSource;
  USR$DEADLINE?: Date;
  USR$CONTACTKEY?: number;
  USR$DISABLED?: boolean;
  USR$DONE?: boolean;
  USR$READYTOWORK?: boolean;
  DEPARTMENT?: IContactWithID;
  DENYREASON?: IDenyReason;
  DENIED?: boolean;
  COMMENT?: string;
  REQUESTNUMBER?: string;
  PRODUCTNAME?: string;
  CONTACT_NAME?: string;
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
  CREATIONDATE?: Date;
  DESCRIPTION?: string;
  USR$NUMBER?: number;
  PREPAID?: boolean;
};

export interface IKanbanCard extends IWithID {
  USR$INDEX: number;
  USR$MASTERKEY: number;
  USR$DEALKEY?: number;
  DEAL?: IDeal;
  TASKS?: IKanbanTask[];
  TASK?: IKanbanTask;
  STATUS?: IKanbanCardStatus;
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
  TASKTYPE?: ITaskType;
  USR$NUMBER?: number;
  USR$INPROGRESS?: boolean;
  DESCRIPTION?: string;
};

export interface IKanbanTaskInfo extends IKanbanTask {
  CONTACT?: IContactWithID;
  APPLICANT_NAME?: string;
};

export interface IActCompletion extends IWithID {
  NUMBER: string;
  DOCUMENTDATE: Date;
  DEPT_NAME: string;
  JOB_NUMBER: string;
  USR$SUMNCU: number;
  JOBWORKNAME?: string;
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

export interface IChartBusinessProcesses {
  name: string;
  amount: number;
}
export interface IChartBusinessDirection {
  name: string;
  amount: number;
  businessProcesses: IChartBusinessProcesses[]
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

export interface IPermissionsAction extends IWithID {
  NAME: string;
  ISACTIVE: boolean;
  CODE: number;
};

export interface IUserGroup extends IWithID {
  NAME: string;
  DESCRIPTION?: string;
  REQUIRED_2FA?: boolean;
};

export interface IUser extends IWithID {
  NAME: string;
  FULLNAME: string;
  CONTACT: IContactWithID;
  DISABLED: boolean;
};

export interface IPermissionsView extends IWithID {
  ACTION: IPermissionsAction;
  USERGROUP: IUserGroup;
  MODE: number;
};

export interface IUserGroupLine extends IWithID {
  USERGROUP: IUserGroup;
  USER?: IUser;
  REQUIRED_2FA?: boolean;
};

export interface IPermissionByUser {
  CODE: number;
  MODE: number;
};

export interface IDenyReason extends IWithID {
  NAME: string;
};

export interface IBusinessProcess extends IWithID {
  NAME: string
}

export interface IDealSource extends IWithID {
  NAME: string;
}

export interface ITaskType extends IWithID {
  NAME: string;
  DESCRIPTION?: string;
}

export interface IKanbanFilterDeadline extends IWithID {
  CODE: number;
  NAME: string;
}

export interface IKanbanLastUsedFilterDeadline extends IWithID {
  USER: IUser;
  FILTER: IKanbanFilterDeadline;
}

type RouteMethod = 'POST' | 'GET' | 'PUT' | 'DELETE';
export type ActionName =
  'deals' |
  'labels' |
  'permissions' |
  'notifications' |
  'faq' |
  'tasks' |
  'customers' |
  'updates' |
  'stages' |
  '';
export type ActionMethod = RouteMethod | 'ALL' | 'COPY' | 'forGroup' | '';

export type Permissions = {
  [key in ActionName]: {
    [key in (ActionMethod)]: boolean;
  }
}

export interface IUpdateHistory extends IWithID {
  VERSION: string;
  CHANGES: string;
  ONDATE: Date;
}

export interface IKanbanCardStatus {
  isRead?: boolean;
  userId?: number;
  cardId?: number;
}

export interface IDealDocument extends IWithID {
  DESCRIPTION: string;
}

export interface IClientHistoryType extends IWithID {
  NAME: string;
  ICON?: number;
}

export interface IClientHistory extends IWithID {
  CREATIONDATE?: Date;
  CONTENT: string;
  CREATOR: IContactWithID;
  CARDKEY: number,
  historyType: IClientHistoryType;
}
