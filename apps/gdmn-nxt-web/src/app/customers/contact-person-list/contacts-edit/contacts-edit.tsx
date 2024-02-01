import './contacts-edit.module.less';
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import {
  Theme
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useCallback, useMemo, useState } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import CustomizedDialog from '@gdmn-nxt/components/Styled/customized-dialog/customized-dialog';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { ContactsSelect } from './contacts-select';
import { IContactPerson } from '@gsbelarus/util-api-types';
import { useUpdateContactPersonMutation } from '../../../features/contact/contactApi';

const useStyles = makeStyles((theme: Theme) => ({
  dialog: {
    position: 'absolute',
    right: 0,
    margin: 0,
    height: '100%',
    maxHeight: '100%',
    width: '30vw',
    minWidth: 500,
    maxWidth: '100%',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  dialogAction: {
    paddingRight: '3%',
    paddingLeft: '3%',
  },
  helperText: {
    '& p': {
      color: '#ec5555',
    },
  },
  button: {
    width: '120px',
  },
  tabPanel: {
    flex: 1,
    display: 'flex',
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
  }
}));

export interface CustomerEditProps {
  open: boolean;
  customerName: string,
  onSubmit?: () => void;
  onCancelClick: () => void;
  customerId: number
}

export function ContactsEdit(props: CustomerEditProps) {
  const { open, onCancelClick, customerId, customerName } = props;

  const [confirmOpen, setConfirmOpen] = useState(false);

  const classes = useStyles();

  const [updatePerson, isFetching] = useUpdateContactPersonMutation();

  const [contacts, setContacts] = useState<IContactPerson[] | undefined>([]);
  const handleConfirmOkClick = useCallback(async () => {
    if (!contacts) return;
    setConfirmOpen(false);
    onCancelClick();
    setContacts([]);
    for (let i = 0;i < contacts?.length;i++) {
      const newPerson: IContactPerson = { ...contacts[i],
        COMPANY: { ID: customerId, NAME: customerName },
        PHONES: contacts[i].PHONES || [],
        EMAILS: contacts[i].EMAILS || [],
        LABELS: contacts[i].LABELS || [],
        MESSENGERS: contacts[i].MESSENGERS || []
      };
      await updatePerson(newPerson);
    }
  }, [contacts]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={'Сохранение'}
      text="Вы уверены, что хотите продолжить?"
      dangerous={false}
      confirmClick={handleConfirmOkClick}
      cancelClick={handleConfirmCancelClick}
    />
  , [confirmOpen]);

  const handleConfirmOpen = () => {
    setConfirmOpen(true);
  };

  return (
    <CustomizedDialog
      open={open}
      onClose={onCancelClick}
    >
      <DialogTitle>
        {'Добавление контактов'}
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0 }}>
        <PerfectScrollbar style={{ padding: '0 24px' }}>
          <Stack
            direction="column"
            spacing={2}
            style={{ flex: 1, display: 'flex' }}
          >
            <ContactsSelect
              onCancelClick={onCancelClick}
              customerId={customerId}
              customerName={customerName}
              value={contacts}
              onChange={(value) => setContacts(value)}
              multiple={true}
            />
          </Stack>
        </PerfectScrollbar>
      </DialogContent>
      <DialogActions>
        <Button
          className={classes.button}
          onClick={() => {}}
          variant="outlined"
          color="primary"
        >
            Отменить
        </Button>
        <Button
          className={classes.button}
          onClick={handleConfirmOpen}
          variant="contained"
        >
            Сохранить
        </Button>
      </DialogActions>
      {memoConfirmDialog}
    </CustomizedDialog>
  );
}

export default ContactsEdit;
