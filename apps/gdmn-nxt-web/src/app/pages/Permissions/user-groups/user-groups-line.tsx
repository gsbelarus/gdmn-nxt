import { Box, IconButton, Switch, Typography } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid-pro';
import StyledGrid from '../../../components/Styled/styled-grid/styled-grid';
import { useDeleteUserGroupLineMutation, useGetUserGroupLineQuery, useUpdateUserGroupLineMutation } from '../../../features/permissions';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { ChangeEvent, useMemo } from 'react';
import { IUserGroup, IUserGroupLine } from '@gsbelarus/util-api-types';

interface IUsersProps{
  group?: IUserGroup;
};

export function Users(props: IUsersProps) {
  const { group } = props;

  const { data: users, isFetching: usersFetching, isLoading: usersLoading } = useGetUserGroupLineQuery(group?.ID ?? -1, { skip: !group?.ID });
  const [updateUser] = useUpdateUserGroupLineMutation();
  const [deleteUserGroupLine] = useDeleteUserGroupLineMutation();

  const onDelete = (id: number) => (e: any) => {
    deleteUserGroupLine(id);
  };

  const onUserChange = (user: IUserGroupLine) => (e: ChangeEvent<HTMLInputElement>) => {
    updateUser({
      ...user,
      REQUIRED_2FA: e.target.checked
    });
  };

  const columns: GridColDef[] = [
    { field: 'NAME', headerName: 'Логин', minWidth: 150,
      valueGetter: ({ row }) => row.USER.NAME
    },
    {
      field: 'CONTACT',
      headerName: 'Сотрудник',
      flex: 1,
      sortComparator: (a, b) => ('' + a.NAME).localeCompare(b.NAME),
      renderCell({ row }) {
        const value = row.USER.CONTACT;
        return (
          <Box>
            <Typography>{value.NAME}</Typography>
            <Typography variant="caption">{value.PHONE && `Тел. ${value.PHONE}`}</Typography>
          </Box>
        );
      },
    },
    { field: 'REQUIRED_2FA', headerName: '2FA', width: 100, resizable: false,
      renderCell: ({ value = false, row }) =>
        <Switch
          checked={value}
          onChange={onUserChange(row)}
          disabled={group?.REQUIRED_2FA ?? false}
        />
    },
    {
      field: 'ACTIONS',
      headerName: '',
      resizable: false,
      width: 100,
      align: 'center',
      renderCell: ({ id }) => {
        return (
          <Box>
            <IconButton onClick={onDelete(Number(id))}>
              <DeleteForeverIcon fontSize="small" color="primary" />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  const UsersView = useMemo(() =>
    <Box flex={1}>
      <StyledGrid
        columns={columns}
        rows={users || []}
        loading={usersLoading}
        getRowHeight={() => 70}
        sx={{
          '& .row-theme-disabled--1': {
            textDecoration: 'line-through',
            backgroundColor: 'rgb(250, 230, 230)'
          }
        }}
        getRowClassName={({ row }) => `row-theme-disabled--${row.DISABLED}`}
        disableSelectionOnClick
      />
    </Box>,
  [users, usersLoading, group]);

  return <>
    {UsersView}
  </>;
};
