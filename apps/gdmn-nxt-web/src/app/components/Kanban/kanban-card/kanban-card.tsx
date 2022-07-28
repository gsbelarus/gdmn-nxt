import './kanban-card.module.less';
import { useMemo, useState } from 'react';
import CustomizedCard from '../../customized-card/customized-card';
import { Box, CircularProgress, IconButton, Stack, Typography, useTheme } from '@mui/material';
import KanbanEditCard from '../kanban-edit-card/kanban-edit-card';
import { DraggableStateSnapshot } from 'react-beautiful-dnd';
import { IKanbanCard, IKanbanColumn, IKanbanTask } from '@gsbelarus/util-api-types';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';


/* eslint-disable-next-line */
export interface KanbanCardProps {
  snapshot: DraggableStateSnapshot;
  card: IKanbanCard;
  columns: IKanbanColumn[];
  onAdd: (card: IKanbanCard) => void;
  onEdit: (card: IKanbanCard) => void;
  onDelete: (card: IKanbanCard) => void;
};


export function KanbanCard(props: KanbanCardProps) {
  const { snapshot } = props;
  const { card, columns } = props;
  const { onAdd, onEdit, onDelete } = props;

  const theme = useTheme();
  const [editCard, setEditCard] = useState(false);
  const [copyCard, setCopyCard] = useState(false);

  const [showActions, setShowActions] = useState(false);

  const cardHandlers = {
    handleSubmit: async (card: IKanbanCard, deleting: boolean) => {
      if (card.ID <= 0) {
        if (!copyCard) return;

        onAdd(card);

        copyCard && setCopyCard(false);

        return;
      };

      if (deleting) {
        onDelete(card);
        setEditCard(false);
        return;
      };

      onEdit(card);
      setEditCard(false);
    },
    handleCancel: async () => {
      editCard && setEditCard(false);
      copyCard && setCopyCard(false);
    },
    OnMouseEnter: async () => {
      setShowActions(true);
    },
    OnMouseExit: async () => {
      setShowActions(false);
    }
  };

  const TaskStatus = useMemo(() => {
    const tasks = card.TASKS;
    if (!tasks || !tasks?.length) return <></>;

    const allTasks = tasks?.length;
    const closedTasks = tasks?.filter(task => task.USR$CLOSED).length;

    return (
      closedTasks
        ? <Stack direction="row" alignItems="center"spacing={0.5}>
          <Box sx={{ position: 'relative', display: 'flex' }}>
            <CircularProgress
              variant="determinate"
              size={15}
              thickness={7}
              value={100}
              sx={{
                color: (theme) =>
                  theme.palette.grey[200],
              }}
            />
            <CircularProgress
              variant="determinate"
              size={15}
              thickness={7}
              value={closedTasks / allTasks * 100}
              sx={{
                position: 'absolute',
                left: 0,
              }}
            />
          </Box>
          <Typography variant="caption">
            {`${closedTasks} из ${allTasks} задач`}
          </Typography>
        </Stack>
        : <Stack direction="row" alignItems="center" spacing={0.5}>
          <FactCheckOutlinedIcon color="action" fontSize="small" />
          <Typography variant="caption">
            {`${allTasks} задач`}
          </Typography>
        </Stack>
    );
  },
  [card]);


  return (
    <div>
      <CustomizedCard
        borders
        key={card.ID}
        style={{
          width: '100%',
          textOverflow: 'ellipsis',
          padding: 5,
          ...(snapshot.isDragging
            ? {
              opacity: 0.7,
              border: `solid ${theme.menu?.backgroundColor}`
            }
            : {
              borderLeft: `solid ${theme.menu?.backgroundColor}`,
            }
          )
        }}
        onDoubleClick={() => setEditCard(true)}
        onMouseEnter={cardHandlers.OnMouseEnter}
        onMouseLeave={cardHandlers.OnMouseExit}
      >
        <Stack direction="column" spacing={1}>
          <Stack direction="row" style={{ position: 'relative' }}>
            <Typography variant="h2" flex={1}>{card.DEAL?.USR$NAME}</Typography>
            {columns.find(column => column.ID === card.USR$MASTERKEY)?.USR$INDEX === 0
              ? <div
                style={{
                  display: showActions ? 'inline' : 'none',
                  position: 'absolute',
                  right: 0,
                }}
              >
                <IconButton size="small" onClick={() => setCopyCard(true)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton >
              </div>
            : <></>}
          </Stack>
          <Typography variant="caption" noWrap>{card.DEAL?.CONTACT?.NAME}</Typography>
          <Typography>{(Math.round((card.DEAL?.USR$AMOUNT || 0) * 100) / 100).toFixed(2)} Br</Typography>
          {TaskStatus}
        </Stack>
      </CustomizedCard>
      <KanbanEditCard
        open={editCard}
        card={card}
        currentStage={columns.find(column => column.ID === card.USR$MASTERKEY)}
        stages={columns}
        onSubmit={cardHandlers.handleSubmit}
        onCancelClick={cardHandlers.handleCancel}
      />
      <KanbanEditCard
        open={copyCard}
        card={{ ...card, ID: -1, DEAL: { ...card.DEAL, ID: -1, USR$NAME: '' } }}
        currentStage={columns.find(column => column.ID === card.USR$MASTERKEY)}
        stages={columns}
        onSubmit={cardHandlers.handleSubmit}
        onCancelClick={cardHandlers.handleCancel}
      />
    </div>
  );
}

export default KanbanCard;

