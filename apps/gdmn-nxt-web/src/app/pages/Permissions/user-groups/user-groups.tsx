import { Box, Button, CardContent, CardHeader, Divider, List, ListItem, ListItemText, Skeleton, Stack, Theme, Typography } from '@mui/material';
import CustomizedCard from '../../../components/Styled/customized-card/customized-card';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import styles from './user-groups.module.less';
import SearchBar from '../../../components/search-bar/search-bar';
import { useAddUserGroupLineMutation, useAddUserGroupMutation, useDeleteUseGroupMutation, useGetUserGroupsQuery, useUpdateUserGroupMutation } from '../../../features/permissions';
import { IUserGroup, IUserGroupLine } from '@gsbelarus/util-api-types';
import { useEffect, useMemo, useState } from 'react';
import { Users } from './user-groups-line';
import AddIcon from '@mui/icons-material/Add';
import { GroupList } from './groupList';
import UserGroupEdit from '../../../components/Permissions/user-group-edit/user-group-edit';
import UserGroupLineEdit from '../../../components/Permissions/user-group-line-edit/user-group-line-edit';


const ItemGroupSkeleton = () => {
  return (
    <Stack spacing={1} p={2}>
      <Skeleton variant="text" height={50} width="40%" />
      <Skeleton variant="text" height={10} width="100%" />
      <Skeleton variant="text" height={10} width="60%" />
    </Stack>
  );
};

/* eslint-disable-next-line */
export interface UserGroupsProps {}

export function UserGroups(props: UserGroupsProps) {
  const { data: userGroups, isLoading: userGroupsLoading, isFetching: userGroupFetching } = useGetUserGroupsQuery();
  const [addUserGroup, { data: addingResult, isSuccess: addingIsSuccess }] = useAddUserGroupMutation();
  const [updateUserGroup] = useUpdateUserGroupMutation();
  const [deleteUserGroup] = useDeleteUseGroupMutation();
  const [addUserGroupLine] = useAddUserGroupLineMutation();

  const [searchName, setSearchName] = useState('');
  const [selectedUserGroup, setSelectedUserGroup] = useState<IUserGroup>();
  const [openEditUserGroupForm, setOpenEditUserGroupForm] = useState(false);
  const [openAddUserGroupForm, setOpenAddUserGroupForm] = useState(false);
  const [openEditUserForm, setOpenEditUserForm] = useState(false);

  const filterHandlers = {
    handleRequestSearch: async (value: string) => {
      setSearchName(value);
    },
    handleCancelSearch: async () => {
      setSearchName('');
    },
  };

  useEffect(() => {
    addingIsSuccess && setSelectedUserGroup(addingResult);
  }, [addingIsSuccess]);

  const userGroupHandlers = {
    handleOnSubmit: async (userGroup: IUserGroup, deleting: boolean) => {
      openEditUserGroupForm && setOpenEditUserGroupForm(false);
      openAddUserGroupForm && setOpenAddUserGroupForm(false);

      if (deleting) {
        deleteUserGroup(userGroup.ID);
        return;
      };

      if (userGroup.ID > 0) {
        updateUserGroup(userGroup);
      } else {
        addUserGroup(userGroup);
      };
    },
    handleCancel: async () => {
      openEditUserGroupForm && setOpenEditUserGroupForm(false);
      openAddUserGroupForm && setOpenAddUserGroupForm(false);
    },
    handleClose: async () => {
      openEditUserGroupForm && setOpenEditUserGroupForm(false);
      openAddUserGroupForm && setOpenAddUserGroupForm(false);
    },
    handleOnEdit: (group: IUserGroup) => (e: any) => {
      setSelectedUserGroup(group);
      setOpenEditUserGroupForm(true);
    },
    handleAdd: () => {
      // setSelectedUserGroup(-1);
      setOpenAddUserGroupForm(true);
    }
  };

  const userUsersHandlers = {
    handleOnSubmit: async (userGroupLine: IUserGroupLine) => {
      setOpenEditUserForm(false);
      addUserGroupLine(userGroupLine);
    },
    handleCancel: async () => {
      setOpenEditUserForm(false);
    },
  };

  const UsersList = useMemo(() =>
    <Users group={userGroups?.find(ug => ug.ID === selectedUserGroup?.ID)}/>,
  [selectedUserGroup, userGroups]);

  return (
    <CustomizedCard
      borders
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardHeader title={<Typography variant="pageHeader">Группы пользователей</Typography>} />
      <Divider />
      <CardContent
        style={{
          flex: 1,
          display: 'flex',
          padding: 0,
        }}
      >
        <Stack direction="row" flex={1}>
          <Stack flex={0.3} p={2} spacing={2}>
            <Stack direction="row">
              <Box flex={1} />
              <Button
                variant="contained"
                disabled={userGroupsLoading}
                startIcon={<AddIcon fontSize="large" />}
                onClick={userGroupHandlers.handleAdd}
              >
                Группа
              </Button>
            </Stack>
            <SearchBar
              disabled={userGroupsLoading}
              onCancelSearch={filterHandlers.handleCancelSearch}
              onChange={filterHandlers.handleRequestSearch}
              cancelOnEscape
              fullWidth
              placeholder="Поиск группы"
            />
            <PerfectScrollbar
              style={{
                maxHeight: 'calc(100vh - 355px)',
                marginRight: -15,
                paddingRight: 15
              }}
            >
              {userGroupsLoading
                ? [...Array(4)].map((el, idx) =>
                  <div key={idx}>
                    {idx !== 0 ? <Divider /> : <></>}
                    <ItemGroupSkeleton />
                  </div>)
                : <GroupList
                  groups={
                    userGroups?.filter(group => group.NAME.toUpperCase().includes(searchName.toUpperCase()))
                    || []
                  }
                  setSelectedUserGroup={setSelectedUserGroup}
                  selectedUserGroup={selectedUserGroup!}
                  onEdit={userGroupHandlers.handleOnEdit}
                />}
            </PerfectScrollbar>
            <UserGroupEdit
              open={openEditUserGroupForm}
              userGroup={userGroups?.find(ug => ug.ID === selectedUserGroup?.ID)}
              onSubmit={userGroupHandlers.handleOnSubmit}
              onCancel={userGroupHandlers.handleCancel}
              onClose={userGroupHandlers.handleClose}
            />
            <UserGroupEdit
              open={openAddUserGroupForm}
              onSubmit={userGroupHandlers.handleOnSubmit}
              onCancel={userGroupHandlers.handleCancel}
              onClose={userGroupHandlers.handleClose}
            />
          </Stack>
          <Divider orientation="vertical" flexItem />
          <Stack flex={1} p={2} spacing={2}>
            <Stack direction="row">
              <Box flex={1} />
              <Button
                variant="contained"
                disabled={userGroupFetching || !selectedUserGroup}
                startIcon={<AddIcon fontSize="large" />}
                onClick={() => setOpenEditUserForm(true)}
              >
                Пользователь
              </Button>
            </Stack>
            {UsersList}
            <UserGroupLineEdit
              open={openEditUserForm}
              userGroupLine={{
                ID: -1,
                USERGROUP: {
                  ID: selectedUserGroup?.ID ?? -1,
                  NAME: ''
                }
              }}
              onSubmit={userUsersHandlers.handleOnSubmit}
              onCancel={userUsersHandlers.handleCancel}
            />
          </Stack>
        </Stack>
      </CardContent>
    </CustomizedCard>
  );
}

export default UserGroups;
