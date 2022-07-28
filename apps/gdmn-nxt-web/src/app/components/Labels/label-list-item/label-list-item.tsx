import { ILabel } from '@gsbelarus/util-api-types';
import { Box, Divider, Grid, IconButton } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import styles from './label-list-item.module.less';
import { CSSProperties, useState } from 'react';
import ConfirmDialog from '../../../confirm-dialog/confirm-dialog';
import { useAddLabelMutation, useDeleteLabelMutation, useUpdateLabelMutation } from '../../../features/labels';
import LabelListItemEdit from '../label-list-item-edit/label-list-item-edit';
import { makeStyles } from '@mui/styles';
import LabelMarker from '../label-marker/label-marker';

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
    console.log('handleDeleteClick');
    setConfirmOpen(true);
  };

  const removeLabel = () => {
    console.log('deleteLabel', ID);
    deleteLabel(ID);
  };

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
  }

  // console.log('hexToRGB', hexToRGB('#7adbb5'));
  // console.log('RGBToHSL', RGBToHSL(hexToRGB('#7adbb5').r, hexToRGB('#7adbb5').g, hexToRGB('#7adbb5').b));

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
        <Grid item xs={2}>
          {/* <div
            className={classes.label}
            style={{
              // border: '1px solid hsl(201.71, 100%, 60%)',
              // backgroundColor: 'hsla(201.71, 100%, 72%, 0.2)',
              // color: 'hsl(201.71, 100%, 60%)',
              color: `hsl(${labelH}, ${labelS}%, ${labelL - 5}%)`,
              backgroundColor: `hsla(${labelH}, ${labelS}%, ${labelL + 20}%, ${backgroundAlpha})`,
              // background: `rgba(${labelR}, ${labelG}, ${labelB}, ${backgroundAlpha})`,
              borderColor: `hsla(${labelH}, ${labelS}%, ${labelL}, ${borderAlpha})`

              // color: hsl(var(--label-h), calc(var(--label-s) * 1%), calc((var(--label-l) + var(--lighten-by)) * 1%));
              // background: rgba(var(--label-r), var(--label-g), var(--label-b), var(--background-alpha));
              // border-color: hsla(var(--label-h), calc(var(--label-s) * 1%), calc((var(--label-l) + var(--lighten-by)) * 1%), var(--border-alpha));
            }}
          >
            {data.USR$NAME}
          </div> */}
          <LabelMarker label={data} />
        </Grid>
        {/* <Grid item xs={4}>
          {data.USR$NAME}
        </Grid> */}
        <Grid item xs={9}>
          {data.USR$DESCRIPTION}
        </Grid>
        <Grid item xs={1}>
          <Box>
            <IconButton onClick={handleEditClick}>
              <EditOutlinedIcon fontSize="small" color="primary" />
            </IconButton>
            <IconButton onClick={handleDeleteClick}>
              <DeleteForeverIcon fontSize="small" color="primary" />
            </IconButton>
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
        setOpen={setConfirmOpen}
        title="Удаление метки"
        text="Вы уверены, что хотите продолжить?"
        onConfirm={removeLabel}
      />
    </Box>
  );
}

export default LabelListItem;
