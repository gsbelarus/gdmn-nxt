import { Box, IconButton, List, ListItem, Stack, Typography } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid-pro';
import { useAddContactPersonMutation, useDeleteContactPersonMutation, useGetContactPersonsQuery, useUpdateContactPersonMutation } from '../../features/contact/contactApi';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import { IContactPerson, IPhone } from '@gsbelarus/util-api-types';
import PersonEdit from '../person-edit/person-edit';
import { useMemo, useState } from 'react';
import StyledGrid from '../../components/Styled/styled-grid/styled-grid';
import CustomLoadingButton from '@gdmn-nxt/components/helpers/custom-loading-button/custom-loading-button';
import EditContact from '@gdmn-nxt/components/Contacts/edit-contact/edit-contact';
import AddContact from '@gdmn-nxt/components/Contacts/add-contact/add-contact';
import ContactsEdit from './contacts-edit/contacts-edit';

export interface ContactPersonListProps {
  customerName: string,
  customerId: number;
}

export function ContactPersonList(props: ContactPersonListProps) {
  const { customerId, customerName } = props;

  const {
    data: persons,
    isFetching: personsIsFetching,
    isLoading,
    refetch
  } = useGetContactPersonsQuery({
    filter: { customerId }
  }, {
    refetchOnMountOrArgChange: true
  });

  const [deletePerson] = useDeleteContactPersonMutation();
  const [addPerson] = useAddContactPersonMutation();
  const [updatePerson] = useUpdateContactPersonMutation();


  const [upsertContact, setUpsertContact] = useState<{
    addContact?: boolean;
    editContact?: boolean;
    contact?: IContactPerson
  }>({
    addContact: false,
    editContact: false
  });

  const handleCancel = async () => {
    setUpsertContact({ editContact: false, addContact: false });
  };

  const [addPersonOpen, setAddPersonOpen] = useState<boolean>(false);

  const handleAddPersonOpen = () => {
    setAddPersonOpen(true);
  };

  const handleAddPersonClose = () => {
    setAddPersonOpen(false);
  };

  const columns: GridColDef[] = [
    { field: 'NAME', headerName: 'Имя', flex: 1,
      renderCell: (params) => {
        return (
          <Stack>
            <Typography>{params.row.NAME}</Typography>
            <Typography variant="caption">{params.row.RANK}</Typography>
            <Typography variant="caption">{params.row.EMAILS ? params.row.EMAILS[0]?.EMAIL : ''}</Typography>
          </Stack>
        );
      }
    },
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
    // { field: 'USR$BG_OTDEL', headerName: 'Отдел', width: 100,
    //   valueGetter: ({ value }) => value?.NAME
    // },
    {
      field: 'ACTIONS',
      headerName: '',
      resizable: false,
      width: 50,
      align: 'center',
      renderCell: (params) => {
        const personId = Number(params.id);

        const handlePersonEdit = () => {
          setUpsertContact({ editContact: true, contact: params.row });
        };

        return (
          <Box>
            <IconButton onClick={handlePersonEdit} disabled={personsIsFetching} >
              <EditOutlinedIcon fontSize="small" color="primary" />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  const handlePersonAddSubmit = async (person: IContactPerson) => {
    handleCancel();

    addPerson(person);
  };

  const handlePersonEditSubmit = async (person: IContactPerson, deleting?: boolean) => {
    deleting ? deletePerson(person.ID) : updatePerson(person);
    handleCancel();
  };

  const memoEditContact = useMemo(() =>
    <EditContact
      open={!!upsertContact.editContact}
      contact={upsertContact.contact!}
      onSubmit={handlePersonEditSubmit}
      onCancel={handleCancel}
    />,
  [upsertContact.contact, upsertContact.editContact]);

  const memoAddContact = useMemo(() =>
    <AddContact
      open={!!upsertContact.addContact}
      contact={upsertContact.contact}
      onSubmit={handlePersonAddSubmit}
      onCancel={handleCancel}
    />,
  [upsertContact.addContact, upsertContact.contact]);

  const memoContactsEdit = useMemo(() => <ContactsEdit
    customerId={customerId}
    customerName={customerName}
    open={addPersonOpen}
    onCancelClick={handleAddPersonClose}
  />, [addPersonOpen]);

  return (
    <Stack direction="column" flex={1}>
      <Stack direction="row">
        <Box flex={1} />
        <CustomLoadingButton
          hint="Обновить данные"
          loading={personsIsFetching}
          onClick={refetch}
        />
        <IconButton
          color="primary"
          onClick={handleAddPersonOpen}
          disabled={(customerId <= 0) || personsIsFetching}
        >
          <AddCircleRoundedIcon />
        </IconButton>
      </Stack>
      <StyledGrid
        rows={persons?.records || []}
        columns={columns}
        loading={personsIsFetching}
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
        hideFooter
        disableColumnResize
      />
      {/* {memUpsertPerson} */}
      {memoEditContact}
      {memoAddContact}
      {memoContactsEdit}
    </Stack>
  );
}

export default ContactPersonList;
