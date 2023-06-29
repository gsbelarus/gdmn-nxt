import { Button, DialogActions, DialogContent, DialogTitle, Box, IconButton, } from '@mui/material';
import PerfectScrollbar from 'react-perfect-scrollbar';
import PermissionsGate from '../Permissions/permission-gate/permission-gate';
import CustomizedDialog from '../Styled/customized-dialog/customized-dialog';
import { ReactJSXElement } from '@emotion/react/types/jsx-namespace';
import ConfirmDialog from '../../confirm-dialog/confirm-dialog';
import { useCallback, useMemo, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';

interface IButton {
  function: () => void,
  name?: string,
  permission?: boolean,
  confirm?: confirmData,
  disabled?: boolean,
  props?: any,
  icon?: ReactJSXElement,
  hide?: boolean
}

export interface PopupProps {
  children: ReactJSXElement,
  open: boolean;
  title: string,
  width: string,
  deleteButton?: IButton,
  closeButton: IButton,
  submitButton?: IButton,
  otherButtons?: IButton[]
}

interface confirmData {
  title: string,
  text?: string,
  dangerous?: boolean,
}

interface fullConfirmData extends confirmData {
  confirmClick: () => void
}

export function CustomProps(props: PopupProps) {
  const { open, width, title, children } = props;
  const { deleteButton, closeButton, submitButton, otherButtons } = props;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);
  const [confirmData, setConfirmData] = useState<fullConfirmData>();

  const ButtonGate = (gateProps: {children: ReactJSXElement, action: boolean | undefined}) => {
    if (gateProps.action !== undefined) {
      return (
        <PermissionsGate actionAllowed={gateProps.action}>
          {gateProps.children}
        </PermissionsGate>
      );
    } else {
      return gateProps.children;
    }
  };

  const PopupButton = (buttonProps: {buttonObj: IButton | undefined}) => {
    const { buttonObj } = buttonProps;
    if (buttonObj === undefined || buttonObj.hide) return <></>;
    const handleClick = () => {
      console.log('ads');
      setConfirmOpen(true);
      buttonObj.confirm && setConfirmData({ ...buttonObj.confirm, confirmClick: buttonObj.function });
    };
    if (buttonObj.icon) {
      return (
        <ButtonGate action={buttonObj.permission} >
          <IconButton
            {...buttonObj.props}
            onClick={buttonObj.confirm ? handleClick : buttonObj.function}
          >
            {buttonObj.icon}
          </IconButton>
        </ButtonGate>
      );
    } else {
      return (
        <ButtonGate action={buttonObj.permission} >
          <Button
            {...buttonObj.props}
            onClick={buttonObj.confirm ? handleClick : buttonObj.function}
          >
            {buttonObj.name || 'Без имени'}
          </Button>
        </ButtonGate>
      );
    }
  };

  const memoConfirmDialog = useMemo(() =>
    <ConfirmDialog
      open={confirmOpen}
      title={confirmData?.title}
      text={confirmData?.text || 'Вы уверены, что хотите продолжить?'}
      dangerous={confirmData?.dangerous || false}
      confirmClick={confirmData?.confirmClick}
      cancelClick={handleConfirmCancelClick}
    />,
  [confirmOpen, confirmData]);

  return (
    <CustomizedDialog
      open={open}
      onClose={closeButton.function}
      width={width}
    >
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0 }}>
        <PerfectScrollbar style={{ padding: '16px 24px', display: 'flex' }}>
          {children}
        </PerfectScrollbar>
      </DialogContent>
      <DialogActions style={{ display: 'flex', padding: '12px 24px 12px 16px !important' }}>
        {deleteButton && <PopupButton buttonObj={{ ...deleteButton, icon: <DeleteIcon/> }}/>}
        {otherButtons?.map((button, index) => {
          return (
            <PopupButton key={index} buttonObj={button}/>
          );
        })}
        <Box flex={1} />
        <PopupButton buttonObj={closeButton}/>
        <PopupButton buttonObj={submitButton}/>
      </DialogActions>
      {memoConfirmDialog}
    </CustomizedDialog>
  );
}

export default CustomProps;
