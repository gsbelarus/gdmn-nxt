import { IUserGroup } from '@gsbelarus/util-api-types';
import { IconButton, List, ListItem, ListItemText, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Dispatch, SetStateAction } from 'react';
import EditIcon from '@mui/icons-material/Edit';

const useStyles = makeStyles((theme: Theme) => ({
  listItem: {
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: theme.color.grey[300],
      color: 'initial',
    },
    '&:hover .actions': {
      display: 'inline',
      position: 'absolute',
      right: 0,
      top: 0
    }
  },
  listItemSelected: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.secondary.main,
  }
}));

interface IGroupList {
  groups: IUserGroup[];
  setSelectedUserGroup?: Dispatch<SetStateAction<IUserGroup | undefined>>;
  selectedUserGroup: IUserGroup;
  onEdit: (id: IUserGroup) => (e: any) => void;
};

export const GroupList = (props: IGroupList) => {
  const { groups, setSelectedUserGroup, selectedUserGroup, onEdit } = props;

  const classes = useStyles();

  const onClick = (group: IUserGroup) => (e: any) => {
    setSelectedUserGroup && setSelectedUserGroup(group);
  };

  return <List>
    {groups.map(group =>
      <ListItem
        className={`
          ${classes.listItem}
          ${group.ID === selectedUserGroup?.ID ? classes.listItemSelected : ''}
        `}
        key={group.ID}
        button
        divider
        sx={{
          py: 2,
        }}
        onClick={onClick(group)}
      >
        <ListItemText>
          <Typography variant="body1">{group.NAME}</Typography>
          <Typography variant="caption" style={{ color: 'inherit' }}>{group.DESCRIPTION}</Typography>
          <div
            className="actions"
            hidden
          >
            <IconButton size="small" onClick={onEdit(group)}>
              <EditIcon fontSize="small" color="primary" />
            </IconButton>
          </div>
        </ListItemText>
      </ListItem>)}
  </List>;
};
