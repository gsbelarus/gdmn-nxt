import { Box, Button, IconButton, List, ListItem, Stack, Typography } from '@mui/material';
import { DataGridPro, GridColDef, ruRU } from '@mui/x-data-grid-pro';
import { useAddContactPersonMutation, useDeleteContactPersonMutation, useGetContactPersonsQuery, useUpdateContactPersonMutation } from '../../../features/contact/contactApi';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IContactPerson, IPhone } from '@gsbelarus/util-api-types';
import { makeStyles } from '@mui/styles';
import PersonEdit from '../person-edit/person-edit';
import { useState } from 'react';

const useStyles = makeStyles((theme) => ({
  DataGrid: {
    border: 'none',
    '& ::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
      backgroundColor: 'transparent',
      borderRadius: '6px'
    },
    '& ::-webkit-scrollbar:hover': {
      backgroundColor: '#f0f0f0',
    },
    '& ::-webkit-scrollbar-thumb': {
      position: 'absolute',
      right: 10,
      borderRadius: '6px',
      backgroundColor: 'rgba(170, 170, 170, 0.5)',
    },
    '& ::-webkit-scrollbar-thumb:hover': {
      width: '10px',
      height: '10px',
      backgroundColor: '#999',
    },
  },
}));

export interface ContactPersonListProps {
  customerId: number;
}

export function ContactPersonList(props: ContactPersonListProps) {
  const { customerId } = props;

  const classes = useStyles();
  const { data: persons, isFetching: personsIsFetching, refetch } = useGetContactPersonsQuery({ customerId });

  const [deletePerson] = useDeleteContactPersonMutation();
  const [addPerson] = useAddContactPersonMutation();
  const [updatePerson] = useUpdateContactPersonMutation();

  const [personEdit, setPersonEdit] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<IContactPerson>();

  const handlePersonEditSubmit = async (values: IContactPerson, deleting: boolean) => {
    setPersonEdit(false);

    if (deleting) {
      deletePerson(values.ID);
      return;
    };

    if (values.ID <= 0) {
      addPerson(values);
      return;
    };

    updatePerson(values);
  };

  const handlePersonEditCancelClick = async () => {
    setPersonEdit(false);
  };

  const handleAddPerson = () => {
    setCurrentPerson({ ID: -1, NAME: '', WCOMPANYKEY: customerId });
    setPersonEdit(true);
  };

  const columns: GridColDef[] = [
    { field: 'NAME', headerName: 'Имя', flex: 1,
      renderCell: (params) => {
        return (
          <Stack>
            <Typography>{params.row.NAME}</Typography>
            <Typography variant="caption">{params.row.RANK}</Typography>
            <Typography variant="caption">{params.row.EMAIL}</Typography>
          </Stack>
        );
      }
    },
    // { field: 'EMAIL', headerName: 'Email' },
    // { field: 'ADDRESS', headerName: 'Адрес' },
    { field: 'PHONES', headerName: 'Телефоны', width: 150, resizable: false,
      renderCell: (params) => {
        return (
          <List>
            {params.row.PHONES?.map((phone: IPhone) =>
              <ListItem
                key={phone.ID}
                style={{
                  padding: '3px 0'
                }}
              >
                {phone.USR$PHONENUMBER}
              </ListItem>
            )}
          </List>
        );
      }
    },
    { field: 'USR$BG_OTDEL', headerName: 'Отдел', width: 100,
      valueGetter: ({ value }) => value?.NAME
    },
    {
      field: 'ACTIONS',
      headerName: '',
      resizable: false,
      width: 50,
      align: 'center',
      renderCell: (params) => {
        const personId = Number(params.id);

        const handlePersonEdit = () => {
          setCurrentPerson(params.row);
          // console.log('handlePersonEdit', params);
          setPersonEdit(true);
        };

        return (
          <Box>
            <IconButton onClick={handlePersonEdit} disabled={personsIsFetching} >
              <EditOutlinedIcon fontSize="small" color="primary" />
            </IconButton>
            {/* <PersonEdit
              open={personEdit}
              person={params.row}
              onSubmit={handlePersonEditSubmit}
              onCancelClick={handlePersonEditCancelClick}
            /> */}
          </Box>
        );
      }
    }
  ];

  return (
    <Stack direction="column" flex={1}>
      <Stack direction="row">
        <Box flex={1} />
        <IconButton color="primary" size="large" onClick={refetch}>
          <RefreshIcon />
        </IconButton>
        <IconButton color="primary" onClick={handleAddPerson} disabled={customerId <= 0}>
          <AddCircleRoundedIcon />
        </IconButton>
      </Stack>
      <DataGridPro
        className={classes.DataGrid}
        localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
        rows={persons || []}
        columns={columns}
        getRowId={row => row.ID}
        loading={personsIsFetching}
        hideFooter
        disableColumnResize
        getRowHeight={(params) => {
          const person: IContactPerson = params.model as IContactPerson;
          const phones = person.PHONES;

          const rowHeight = 70;
          if (phones?.length) {
            const newRowHeight = 30 * phones?.length;
            return newRowHeight > rowHeight ? newRowHeight : rowHeight;
          };

          return rowHeight;
        }}
      />
      <PersonEdit
        open={personEdit}
        person={currentPerson}
        onSubmit={handlePersonEditSubmit}
        onCancelClick={handlePersonEditCancelClick}
      />
      {/* <PersonEdit
          open={personEdit}
          person={
            allCustomers
              .find(element => element.ID === currentOrganization)
            || null
          }
          onSubmit={handleOrganiztionEditSubmit}
          onCancelClick={handleOrganiztionEditCancelClick}
          onDeleteClick={handleOrganizationDeleteOnClick}
        />          */}
    </Stack>
  );
}

export default ContactPersonList;
