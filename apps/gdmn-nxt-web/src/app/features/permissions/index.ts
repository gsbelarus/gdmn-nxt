import { IPermissionByUser, IPermissionsAction, IPermissionsView, IRequestResult, IUser, IUserGroup, IUserGroupLine } from '@gsbelarus/util-api-types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseUrlApi } from '../../const';

type MatrixResponse = IPermissionsView[];
type IMatrixRequestResult = IRequestResult<{ cross: IPermissionsView[]}>;

type ActionsResponse = IPermissionsAction[];
type IActionsRequestResult = IRequestResult<{ actions: IPermissionsAction[]}>;

type UserGroupsResponse = IUserGroup[];
type IUserGroupsRequestResult = IRequestResult<{ userGroups: IUserGroup[]}>;
type IUserGroupRequestResult = IRequestResult<{ userGroup: IUserGroup}>;

type IUserGroupsLineRequestResult = IRequestResult<{ users: IUserGroupLine[]}>;

type UsersResponse = IUser[];
type IUsersRequestResult = IRequestResult<{ users: IUser[]}>;


type IPermissionByUserRequestResult = IRequestResult<{ action: IPermissionByUser}>;

export enum Action {
  CreateDeal = 1,
  EditDeal = 3,
  DeleteDeal = 4,
  CopyDeal = 2,
  ShowAllDeals = 9,
  CreateLabel = 5,
  EditLabel = 6,
  DeleteLabel = 7,
  PermissionsSettings = 8,
  NotificationCenter = 10,
  CreateFAQ = 11,
  EditFAQ = 12,
  DeleteFAQ = 13
}

const SetActions = (num:number) => {
  const { data } = useGetActionsQuery();
};

export const permissionsApi = createApi({
  reducerPath: 'permissions',
  tagTypes: ['Matrix', 'Actions', 'UserGroups', 'Users', 'ActionByUser'],
  baseQuery: fetchBaseQuery({ baseUrl: baseUrlApi, credentials: 'include' }),
  endpoints: (builder) => ({
    getMatrix: builder.query<MatrixResponse, void>({
      query: () => 'permissions',
      transformResponse: (response: IMatrixRequestResult) => response.queries.cross || [],
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'Matrix' as const, ID })),
            { type: 'Matrix', id: 'LIST' }
          ]
          : [{ type: 'Matrix', id: 'LIST' }]
    }),
    getActions: builder.query<ActionsResponse, void>({
      query: () => 'permissions/actions',
      transformResponse: (response: IActionsRequestResult) => response.queries.actions || [],
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'Actions' as const, ID })),
            { type: 'Actions', id: 'LIST' }
          ]
          : [{ type: 'Actions', id: 'LIST' }]
    }),
    updateMatrix: builder.mutation<IPermissionsView, Partial<IPermissionsView>>({
      query: (body) => ({
        url: 'permissions',
        method: 'PUT',
        body
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: 'Matrix', id: result?.ID }, { type: 'Matrix', id: 'LIST' }, { type: 'ActionByUser', id: 'LIST' }]
          : [{ type: 'Matrix', id: 'LIST' }]
    }),
    getUsersByGroup: builder.query<UsersResponse, number>({
      query: (groupID) => `permissions/userGroups/${groupID}/users`,
      transformResponse: (response: IUsersRequestResult) => response.queries.users || [],
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'Users' as const, ID })),
            { type: 'Users', id: 'LIST' }
          ]
          : [{ type: 'Users', id: 'LIST' }]
    }),
    getUserGroupLine: builder.query<IUserGroupLine[], number>({
      query: (groupID) => `permissions/usergroupsline/${groupID}`,
      transformResponse: (response: IUserGroupsLineRequestResult) => response.queries.users || [],
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'Users' as const, ID })),
            { type: 'Users', id: 'LIST' }
          ]
          : [{ type: 'Users', id: 'LIST' }]
    }),
    getUserGroups: builder.query<UserGroupsResponse, void>({
      query: () => 'permissions/usergroups',
      transformResponse: (response: IUserGroupsRequestResult) => response.queries.userGroups || [],
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ ID }) => ({ type: 'UserGroups' as const, ID })),
            { type: 'UserGroups', id: 'LIST' }
          ]
          : [{ type: 'UserGroups', id: 'LIST' }]
    }),
    addUserGroup: builder.mutation<IUserGroup, Partial<IUserGroup>>({
      query: (body) => ({
        url: 'permissions/usergroups',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'UserGroups', id: 'LIST' }],
      transformResponse: (result: IUserGroupRequestResult) => result.queries.userGroup
    }),
    updateUserGroup: builder.mutation<IUserGroup, Partial<IUserGroup>>({
      query(data) {
        const { ID, ...body } = data;
        return {
          url: `permissions/userGroups/${ID}`,
          method: 'PUT',
          body
        };
      },
      invalidatesTags: (result) =>
        result
          ? [{ type: 'UserGroups', id: result?.ID }, { type: 'UserGroups', id: 'LIST' }]
          : [{ type: 'UserGroups', id: 'LIST' }],
    }),
    deleteUseGroup: builder.mutation<{ id: number}, number>({
      query: (id) => ({
        url: `permissions/usergroups/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: 'UserGroups', id: result.id }, { type: 'UserGroups', id: 'LIST' }]
          : [{ type: 'UserGroups', id: 'LIST' }]
    }),
    addUserGroupLine: builder.mutation<IUserGroupLine, Partial<IUserGroupLine>>({
      query: (body) => ({
        url: 'permissions/usergroupsline',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }]
    }),
    deleteUserGroupLine: builder.mutation<{ id: number }, number>({
      query: (id) => ({
        url: `permissions/usergroupsline/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result) =>
        result
          ? [{ type: 'Users', id: result?.id }, { type: 'Users', id: 'LIST' }]
          : [{ type: 'Users', id: 'LIST' }]
    }),
    getPermissionByUser: builder.query<IPermissionByUser, { actionCode: number, userID: number }>({
      query: ({ actionCode, userID }) => `permissions/actions/${actionCode}/byUser/${userID}`,
      transformResponse: (response: IPermissionByUserRequestResult) => response.queries.action,
      providesTags: (result) =>
        result
          ? [
            { type: 'ActionByUser' as const, id: result.CODE },
            { type: 'ActionByUser', id: 'LIST' }
          ]
          : [{ type: 'ActionByUser', id: 'LIST' }]
    })
  })
});

export const {
  useGetMatrixQuery,
  useGetActionsQuery,
  useGetUserGroupsQuery,
  useUpdateMatrixMutation,
  useGetUsersByGroupQuery,
  useAddUserGroupLineMutation,
  useAddUserGroupMutation,
  useDeleteUseGroupMutation,
  useDeleteUserGroupLineMutation,
  useUpdateUserGroupMutation,
  useGetUserGroupLineQuery,
  useGetPermissionByUserQuery
} = permissionsApi;

