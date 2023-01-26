import { ILabel } from '@gsbelarus/util-api-types';
import { Box, Divider, Grid, IconButton } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import styles from './label-list-item.module.less';
import { CSSProperties, useCallback, useState } from 'react';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { useAddLabelMutation, useDeleteLabelMutation, useUpdateLabelMutation } from '../../../features/labels';
import LabelListItemEdit from '../label-list-item-edit/label-list-item-edit';
import { makeStyles } from '@mui/styles';
import LabelMarker from '../label-marker/label-marker';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';

export interface LabelListItemProps {
  data: ILabel;
}

const labelStyle: CSSProperties = {
  display: 'inline-block',
  fontSize: '0.625rem',
  fontWeight: 'bold',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  textTransform: 'uppercase',
  borderRadius: '2em',
  padding: '2.5px 9px',
  margin: '0px 5px',
  width: 'fit-content',
  height: 'fit-content',
  border: '1px solid hsl(201.71, 100%, 60%)',
  backgroundColor: 'hsla(201.71, 100%, 72%, 0.2)',
  color: 'hsl(201.71, 100%, 60%)',
};


const useStyles = makeStyles(() => ({
  label: {
    display: 'inline-block',
    fontSize: '0.625rem',
    fontWeight: 'bold',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    textTransform: 'uppercase',
    borderRadius: '2em',
    padding: '2.5px 9px',
    margin: '0px 5px',
    width: 'fit-content',
    height: 'fit-content',
    border: '1px solid'
  }
}));

// a: 1
// h: 24.705882352941174
// l: 0.5
// s: 1

export function LabelListItem(props: LabelListItemProps) {
  const { data } = props;
  const { ID } = data;

  const [openEditForm, setOpenEditForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [deleteLabel] = useDeleteLabelMutation();
  const [addLabel] = useAddLabelMutation();
  const [updateLabel] = useUpdateLabelMutation();

  const classes = useStyles();


  const handleEditClick = () => {
    setOpenEditForm(true);
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  // const removeLabel = () => {
  //   deleteLabel(ID);
  // };

  const handleOnSubmit = (label: ILabel) => {
    // console.log('handleOnSubmit', label);
    setOpenEditForm(false);

    if (label.ID) {
      updateLabel(label);
      return;
    };

    addLabel(label);
  };

  const handleCancelClick = () => {
    setOpenEditForm(false);
  };

  const handleConfirmOkClick = useCallback(() => {
    setConfirmOpen(false);
    deleteLabel(ID);
  }, [ID]);

  const handleConfirmCancelClick = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  function hexToRGB(h: any) {
    let r = 0, g = 0, b = 0;

    // 3 digits
    if (h.length === 4) {
      r = h[1] + h[1];
      g = h[2] + h[2];
      b = h[3] + h[3];

    // 6 digits
    } else if (h.length === 7) {
      r = parseInt(h[1] + h[2], 16);
      g = parseInt(h[3] + h[4], 16);
      b = parseInt(h[5] + h[6], 16);
    }

    return { r, g, b };
  }

  function RGBToHSL(r: number, g: number, b: number) {
    // Make r, g, and b fractions of 1
    r /= 255;
    g /= 255;
    b /= 255;

    // Find greatest and smallest channel values
    const cmin = Math.min(r, g, b),
      cmax = Math.max(r, g, b),
      delta = cmax - cmin
    let h = 0,
      s = 0,
      l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
  };

  const rgb = hexToRGB(data.USR$COLOR);
  const hsl = RGBToHSL(rgb.r, rgb.g, rgb.b);
  // const labelR = 0;
  // const labelG = 117;
  // const labelB = 202;
  const labelH = hsl.h;
  const labelS = hsl.s;
  const labelL = hsl.l;
  const backgroundAlpha = 0.2;
  const borderAlpha = 0.3;

  return (
    <Box className={styles['Box-row']}>
      <Grid container alignItems="center">
        <Grid item xs={4} paddingLeft={2} paddingRight={2}>
          <LabelMarker label={data} />
        </Grid>
        {/* <Grid item xs={4}>
          {data.USR$NAME}
        </Grid> */}
        <Grid item xs={7}>
          {data.USR$DESCRIPTION}
        </Grid>
        <Grid item xs={1}>
          <Box>
            <PermissionsGate actionCode={6}>
              <IconButton onClick={handleEditClick}>
                <EditOutlinedIcon fontSize="small" color="primary" />
              </IconButton>
            </PermissionsGate>
            <PermissionsGate actionCode={7}>
              <IconButton onClick={handleDeleteClick}>
                <DeleteForeverIcon fontSize="small" color="primary" />
              </IconButton>
            </PermissionsGate>
          </Box>
        </Grid>
      </Grid>
      <LabelListItemEdit
        open={openEditForm}
        label={data}
        onSubmit={handleOnSubmit}
        onCancelClick={handleCancelClick}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Удаление метки"
        text="Вы уверены, что хотите продолжить?"
        dangerous
        confirmClick={handleConfirmOkClick}
        cancelClick={handleConfirmCancelClick}
      />
    </Box>
  );
}

export default LabelListItem;
