import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton, TextField, Tooltip, Typography, TypographyProps, styled } from '@mui/material';
import styles from './editable-typography.module.less';
import { KeyboardEvent, MutableRefObject, createElement, useEffect, useMemo, useState } from 'react';
import { useOutsideClick } from '../../features/common/useOutsideClick';

export interface EditableTypographyProps extends TypographyProps {
  name?: string;
  value: string;
  editComponent?: ((popupRef: MutableRefObject<any>) => React.ReactNode) | React.ReactNode;
  deleteable?: boolean;
  deleteNull?: boolean,
  link?: string,
  onDelete?: () => void;
}

export const EditableTypography = styled(({
  value,
  name,
  onDelete,
  onChange,
  editComponent,
  deleteable = false,
  deleteNull = false,
  link,
  ...props
}: EditableTypographyProps) => {
  const [editText, setEditText] = useState(!value);
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState('');
  useEffect(() => {
    setCurrent(value);
    if (editText) {
      setIsOpen(true);
    }
  }, [editText, value]);

  const [ref, secondRef] = useOutsideClick(isOpen, [value], () => {
    onClose();
  });

  const editElement = useMemo(() => {
    if (typeof editComponent === 'object' && editComponent && 'props' in editComponent) {
      return createElement('div', {
        onClick: (e: any) => {
          e.preventDefault();
        },
        style: {
          flex: 1
        }

      },
      editComponent);
    }
    if (typeof editComponent === 'function') {
      return editComponent(secondRef);
    }
    return editComponent;
  }, [editComponent]);

  const handleEdit = (e: any) => {
    e.preventDefault();
    setEditText(true);
  };

  const onClose = () => {
    if (value.trim().length === 0 && deleteNull) {
      onDelete && onDelete();
    }
    setIsOpen(false);
    setEditText(false);
  };

  const handleClose = (e: any) => {
    e.preventDefault();
    onClose();
  };

  const handleDelete = (e: any) => {
    e.preventDefault();
    onDelete && onDelete();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    e.key === 'Escape' && handleClose(e);
  };

  const editElementComponent = <div ref={ref}>{editText
    ? editElement ??
  <TextField
    variant="standard"
    value={value}
    name={name}
    fullWidth
    onChange={onChange}
  />
    : <Typography
      {...props}
      className={styles['title']}
      autoFocus
      >
      {value}
    </Typography>
  }
  </div>;

  return (
    <div
      aria-label="editable-typography"
      className={styles['container']}
      onKeyDown={onKeyDown}
    >
      {(link && !editText) ?
        <a
          className={styles.link}
          href={link}
        >
          {editElementComponent}
        </a>
        : editElementComponent}
      <div
        className={`${styles['actions']} ${editText ? styles['visible'] : styles['hidden']}`}
      >
        {editText
          ? <Tooltip arrow title="Закрыть окно редактирования">
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" color="primary" />
            </IconButton >
          </Tooltip>
          : <Tooltip arrow title="Редактировать">
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon fontSize="small" color="primary" />
            </IconButton >
          </Tooltip>
        }
        {deleteable &&
          <Tooltip arrow title="Удалить">
            <IconButton size="small" onClick={handleDelete}>
              <DeleteIcon fontSize="small" color="primary" />
            </IconButton >
          </Tooltip>
        }
      </div>
    </div>
  );
})(() => ({}));

export default EditableTypography;
