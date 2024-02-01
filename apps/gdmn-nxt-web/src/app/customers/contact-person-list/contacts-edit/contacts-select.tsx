import { IContactPerson, ICustomer } from '@gsbelarus/util-api-types';
import { Autocomplete, AutocompleteRenderOptionState, Box, Button, Checkbox, IconButton, TextField, TextFieldProps, createFilterOptions } from '@mui/material';
import { useGetCustomersQuery } from 'apps/gdmn-nxt-web/src/app/features/customer/customerApi_new';
import { HTMLAttributes, useCallback, useMemo, useState } from 'react';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import EditIcon from '@mui/icons-material/Edit';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { makeStyles } from '@mui/styles';
import CustomPaperComponent from '@gdmn-nxt/components/helpers/custom-paper-component/custom-paper-component';
import { useAddContactPersonMutation, useDeleteContactPersonMutation, useGetContactPersonsQuery, useUpdateContactPersonMutation } from '../../../features/contact/contactApi';
import EditContact from '@gdmn-nxt/components/Contacts/edit-contact/edit-contact';
import AddContact from '@gdmn-nxt/components/Contacts/add-contact/add-contact';

const useStyles = makeStyles(() => ({
  root: {
    '& .editIcon': {
      visibility: 'hidden',
      padding: '4px'
    },
    '&:hover .editIcon, &:focus-within .editIcon': {
      visibility: 'visible',
    }
  },
}));


type BaseTextFieldProps = Omit<
  TextFieldProps,
  'onChange'
>;

type Value<Multiple> = Multiple extends true ? Array<IContactPerson> : IContactPerson;

interface ContactSelectProps<Multiple extends boolean | undefined> extends BaseTextFieldProps {
  customerId: number,
  customerName: string,
  value?: Value<Multiple>;
  onChange?: (value: Value<Multiple> | undefined) => void;
  onCancelClick: () => void;
  multiple?: Multiple;
};

export function ContactsSelect<Multiple extends boolean | undefined = false>(props: ContactSelectProps<Multiple>) {
  const {
    customerId,
    customerName,
    value,
    onChange,
    multiple = false,
    onCancelClick,
    ...rest
  } = props;

  const classes = useStyles();

  const {
    data: persons,
    isFetching: personsIsFetching,
    isLoading,
    refetch: personsRefetch
  } = useGetContactPersonsQuery();

  const contacts = persons?.records || [];

  const { data: customersResponse, isFetching: customersIsFetching } = useGetCustomersQuery();

  const [upsertContact, setUpsertContact] = useState<{
    addContact?: boolean;
    editContact?: boolean;
    contact?: IContactPerson
  }>({
    addContact: false,
    editContact: false
  });

  const [deletePerson] = useDeleteContactPersonMutation();
  const [addPerson, { isLoading: insertIsLoading }] = useAddContactPersonMutation();
  const [updatePerson] = useUpdateContactPersonMutation();

  const handleCancel = async () => {
    setUpsertContact({ editContact: false, addContact: false });
    onCancelClick();
  };

  const handlePersonEditSubmit = async (person: IContactPerson, deleting?: boolean) => {
    deleting ? deletePerson(person.ID) : updatePerson(person);
    handleCancel();
  };

  const handlePersonAddSubmit = async (person: IContactPerson) => {
    handleCancel();
    addPerson(person);
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

  const handleChange = (e: any, value: ICustomer | ICustomer[] | null) => onChange && onChange(value as Value<Multiple>);

  const handleAddPerson = () => {
    setUpsertContact({ addContact: true, contact: { ID: -1, NAME: '', COMPANY: { ID: customerId, NAME: customerName } } });
  };

  const handleEditPerson = (person: IContactPerson | undefined) => () => {
    if (!person) return;
    setUpsertContact({ addContact: false, contact: person });
  };

  const memoPaperFooter = useMemo(() =>
    <div>
      <Button
        startIcon={<AddCircleRoundedIcon />}
        onClick={handleAddPerson}
      >Создать Контакт</Button>
    </div>,
  []);

  const filterOptions = createFilterOptions({
    matchFrom: 'any',
    limit: 50,
    ignoreCase: true,
    stringify: (option: IContactPerson) => `${option.NAME} ${option.ID}`,
  });

  return (
    <>
      <Autocomplete
        className={classes.root}
        fullWidth
        multiple={multiple}
        limitTags={2}
        filterOptions={filterOptions}
        PaperComponent={CustomPaperComponent({ footer: memoPaperFooter })}
        getOptionLabel={useCallback((option: IContactPerson) => option.NAME, [])}
        loading={customersIsFetching || insertIsLoading}
        {...(insertIsLoading
          ? {
            options: [],
            value: multiple ? [] : null
          }
          : {
            options: contacts,
            value: multiple && Array.isArray(value)
              ? contacts.filter(customer => value?.find(el => el.ID === customer.ID)) ?? []
              : contacts?.find(el => el.ID === (value as ICustomer)?.ID) ?? null
          })
        }
        loadingText="Загрузка данных..."
        onChange={handleChange}
        renderOption={useCallback((props: HTMLAttributes<HTMLLIElement>, option: IContactPerson, { selected }: AutocompleteRenderOptionState) => {
          return (
            <li
              {...props}
              key={option.ID}
              style={{ display: 'flex' }}
            >
              {multiple &&
                <Checkbox
                  icon={<CheckBoxOutlineBlankIcon />}
                  checkedIcon={<CheckBoxIcon />}
                  style={{ marginRight: 8 }}
                  checked={selected}
                />}
              <Box flex={1}>
                <div style={{ flex: 1, display: 'flex' }}>
                  <div style={{ flex: 1 }}>
                    {option.NAME}
                  </div>
                  <IconButton size="small" onClick={handleEditPerson(option)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </div>
              </Box>
            </li>
          );
        }, [])}
        renderInput={useCallback((params) => (
          <TextField
            label="Контакт"
            placeholder={`${insertIsLoading ? 'Создание...' : 'Выберите Контакт'}`}
            {...params}
            {...rest}
            InputProps={{
              ...params.InputProps,
              ...rest.InputProps,
              endAdornment: (
                <>
                  {(value && (!Array.isArray(value))) &&
                    <IconButton
                      className="editIcon"
                      title="Изменить"
                      size="small"
                      onClick={handleEditPerson(contacts?.find(el => el.ID === value?.ID))}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>}
                  {params.InputProps.endAdornment}
                </>)
            }}
          />
        ), [value])}
      />
      {memoAddContact}
      {memoEditContact}
    </>
  );
}
