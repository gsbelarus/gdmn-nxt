import './kanban-card.module.less';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomizedCard from '../../Styled/customized-card/customized-card';
import { Box, IconButton, Stack, Typography, useTheme, Theme } from '@mui/material';
import KanbanEditCard from '../kanban-edit-card/kanban-edit-card';
import { DraggableStateSnapshot } from '@hello-pangea/dnd';
import { ColorMode, IKanbanCard, IKanbanColumn, IKanbanTask, Permissions } from '@gsbelarus/util-api-types';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import PermissionsGate from '../../Permissions/permission-gate/permission-gate';
import { useSetCardStatusMutation } from '../../../features/kanban/kanbanApi';
import { TaskStatus } from './task-status';
import { setCardIdForOpen } from '../../../store/kanbanSlice';

export interface KanbanCardProps {
  snapshot: DraggableStateSnapshot;
  card: IKanbanCard;
  columns: IKanbanColumn[];
  onAdd: (card: IKanbanCard) => void;
  onEdit: (card: IKanbanCard) => void;
  onDelete: (card: IKanbanCard) => void;
  addIsFetching?: boolean;
  lastCard?: IKanbanCard
  clearLastCard?: (isAdd?: boolean) => void,
  onAddTask: (task: IKanbanTask) => void;
  onEditTask: (task: IKanbanTask) => void;
  onDeleteTask: (task: IKanbanTask) => void;
};

export function KanbanCard(props: KanbanCardProps) {
  const { snapshot } = props;
  const { card, columns, lastCard, addIsFetching } = props;
  const { onAdd, onEdit, onDelete, clearLastCard, onAddTask, onEditTask, onDeleteTask } = props;
  const theme = useTheme();
  const userPermissions = useSelector<RootState, Permissions | undefined>(state => state.user.userProfile?.permissions);
  const colorMode = useSelector((state: RootState) => state.settings.customization.colorMode);
  const colorModeIsLight = useMemo(() => colorMode === ColorMode.Light, [colorMode]);
  const [editCard, setEditCard] = useState(false);
  const [copyCard, setCopyCard] = useState(false);
  const kanbanStorage = useSelector((state: RootState) => state.kanbanStorage);
  const [upsertCardStatus] = useSetCardStatusMutation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (kanbanStorage.cardIdForOpen === -1) return;
    if (kanbanStorage.cardIdForOpen !== card.ID) return;
    setEditCard(true);
    dispatch(setCardIdForOpen(-1));
  }, [kanbanStorage]);

  const cardHandlers = {
    handleSubmit: (newCard: IKanbanCard, deleting: boolean) => {
      if (deleting) {
        onDelete(newCard);
        setEditCard(false);
        return;
      };

      if (newCard.ID && !deleting) {
        onEdit(newCard);
        copyCard && setCopyCard(false);
        setEditCard(false);
        clearLastCard && clearLastCard();

        const deletedTasks = card.TASKS?.filter(task => (newCard.TASKS?.findIndex(({ ID }) => ID === task.ID) ?? -1) < 0) ?? [];
        deletedTasks.forEach(task => onDeleteTask(task));

        newCard.TASKS?.forEach(task => {
          const oldTask = card.TASKS?.find(({ ID }) => ID === task.ID);
          if (!oldTask) {
            onAddTask({ ...task, ID: -1 });
            return;
          };

          if (JSON.stringify(task) !== JSON.stringify(oldTask)) {
            onEditTask(task);
          };
        });
      } else {
        onAdd(newCard);
        copyCard && setCopyCard(false);
      }
    },
    handleCancel: async (isFetching?: boolean) => {
      editCard && setEditCard(false);
      copyCard && setCopyCard(false);
    },
    handleClose: async (e: any, reason: string) => {
      if (reason === 'backdropClick') setEditCard(false);
    },
  };

  const handleCopyCard = useCallback(() => setCopyCard(true), []);

  const memoEditCard = useMemo(() => {
    return (
      <KanbanEditCard
        open={editCard}
        card={card}
        currentStage={columns.find(column => column.ID === card.USR$MASTERKEY)}
        stages={columns}
        onSubmit={cardHandlers.handleSubmit}
        onCancelClick={cardHandlers.handleCancel}
      />
    );
  }, [editCard]);

  const memoCopyCard = useMemo(() => {
    return (
      <KanbanEditCard
        open={copyCard}
        card={{
          ID: -1,
          USR$INDEX: 0,
          USR$MASTERKEY: 0,
          DEAL: {
            ID: -1,
            CONTACT: card?.DEAL?.CONTACT,
            SOURCE: card?.DEAL?.SOURCE,
            USR$AMOUNT: card?.DEAL?.USR$AMOUNT,
            USR$DEADLINE: card?.DEAL?.USR$DEADLINE,
            DEPARTMENT: card?.DEAL?.DEPARTMENT,
            PERFORMERS: card?.DEAL?.PERFORMERS,
            PRODUCTNAME: card?.DEAL?.PRODUCTNAME,
            REQUESTNUMBER: card?.DEAL?.REQUESTNUMBER,
            CONTACT_NAME: card?.DEAL?.CONTACT_NAME,
            CONTACT_EMAIL: card?.DEAL?.CONTACT_EMAIL,
            CONTACT_PHONE: card?.DEAL?.CONTACT_PHONE,
          },
        }}
        currentStage={columns.find(column => column.ID === card.USR$MASTERKEY)}
        stages={columns}
        onSubmit={cardHandlers.handleSubmit}
        onCancelClick={cardHandlers.handleCancel}
      />
    );
  }, [copyCard, lastCard]);

  const getDayDiff = useCallback((startDate: Date, endDate: Date) => {
    const msInDay = 24 * 60 * 60 * 1000;

    return Math.round(
      (startDate.getTime() - endDate.getTime()) / msInDay,
    );
  }, []);

  const userId = useSelector<RootState, number | undefined>(state => state.user.userProfile?.id);
  const contactId = useSelector<RootState, number | undefined>(state => state.user.userProfile?.contactkey);

  const doubleClick = useCallback(() => {
    const isPerformer = card.DEAL?.PERFORMERS?.some(performer => performer.ID === contactId);
    const isCreator = card.DEAL?.CREATOR?.ID === contactId;

    if (!card.STATUS?.isRead && (isCreator || isPerformer)) {
      upsertCardStatus({
        isRead: true,
        userId,
        cardId: card.ID
      });
    }
    setEditCard(true);
  }, [card]);

  const dayCalc = (days: number): string => {
    const positiveDays = Math.abs(days);
    const lastNumber = positiveDays % 10;
    const preLast = positiveDays % 100;
    if (preLast >= 5 && preLast <= 20) return 'дней';
    if (lastNumber === 1) {
      return 'день';
    }
    if (lastNumber >= 2 && lastNumber <= 4) {
      return 'дня';
    }
    if (lastNumber >= 5 || lastNumber === 0) {
      return 'дней';
    }
    return '';
  };
  const dayColor = (days: number, baseColor?: string): string => {
    if (days === 1) return 'rgb(255, 214, 0)';
    if (days <= 0) return 'rgb(255, 82, 82)';
    return baseColor ? baseColor : colorModeIsLight ? 'GrayText' : 'lightgray';
  };
  const deadLine = useMemo(() => {
    if (!card.DEAL?.USR$DEADLINE) return null;
    const deadline = Number(Math.ceil((new Date(card.DEAL?.USR$DEADLINE).getTime() - new Date().valueOf()) / (1000 * 60 * 60 * 24)) + '');
    return (
      <Stack direction="row">
        <Typography variant="h2">
          {'Срок: '}
          {card.DEAL?.USR$DEADLINE
            ? (new Date(card.DEAL.USR$DEADLINE)).toLocaleString('default', { day: '2-digit', month: 'short', year: '2-digit' })
            : '-/-'}
        </Typography>
        <Box flex={1} />
        <Typography variant="h2" style={{ color: dayColor(deadline) }}>
          {deadline === 0 ? 'Сегодня' : Math.abs(deadline) + ' ' + dayCalc(deadline)}
        </Typography>
      </Stack>
    );
  }, [card, colorModeIsLight]);
  const memoCard = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 10);

    const dateDiff = getDayDiff(card.DEAL?.USR$DEADLINE ? new Date(card.DEAL.USR$DEADLINE) : tomorrow, today);

    const isFirstColumn = columns.find(column => column.ID === card.USR$MASTERKEY)?.USR$INDEX === 0;
    return (
      <CustomizedCard
        borders={colorMode === ColorMode.Light}
        key={card.ID}
        style={{
          width: '100%',
          textOverflow: 'ellipsis',
          padding: 5,
          backgroundColor: colorMode === ColorMode.Light ? 'whitesmoke' : 'dimgrey',
          ...(card?.STATUS?.hasOwnProperty('isRead') && !card?.STATUS?.isRead
            ? {
              backgroundColor: 'rgba(193, 228, 250, 0.5)',
              borderTop: '1px solid rgb(13, 228, 250)',
              borderBottom: '1px solid rgb(13, 228, 250)',
              borderRight: '1px solid rgb(13, 228, 250)',
            }
            : {}),
          ...(snapshot.isDragging
            ? {
              opacity: 0.7,
              border: `solid ${theme.menu?.backgroundColor}`
            }
            : {
              borderLeft: `0.5rem solid ${
                (() => {
                  if (card.DEAL?.USR$DONE) return theme.palette.primary.main;
                  switch (true) {
                    case dateDiff <= 0:
                      return theme.color.red.A200;
                    case dateDiff > 1:
                      return theme.palette.primary.main;
                    case dateDiff > 0:
                    case dateDiff < 1:
                      return theme.color.yellow.A700;
                    default:
                      return theme.palette.primary.main;
                  }
                })()
              }`,
            }
          )
        }}
        sx={{
          '&:hover .actions': {
            display: 'inline',
            position: 'absolute',
            right: 0,
          },
          '&:hover .number': {
            display: isFirstColumn ? 'none' : 'inline',
          },
          '&:hover': {
            boxShadow: '0 4px 18px rgba(0,0,0,.3)'
          }
        }}
        onDoubleClick={doubleClick}
      >
        <Stack direction="column" spacing={0.5}>
          <Stack
            direction="row"
            style={{ position: 'relative' }}
          >
            <Typography variant="h4" flex={1}>{card.DEAL?.USR$NAME}</Typography>
            <Typography
              className="number"
              variant="caption"
              color={colorModeIsLight ? 'GrayText' : 'lightgray'}
            >{'#' + card.DEAL?.USR$NUMBER}</Typography>
            {isFirstColumn
              ?
              <PermissionsGate actionAllowed={userPermissions?.deals.COPY}>
                <div
                  className="actions"
                  hidden
                >
                  <IconButton
                    size="small"
                    disabled={addIsFetching}
                    onClick={handleCopyCard}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </div>
              </PermissionsGate>
              : null
            }
          </Stack>
          <Typography variant="caption" noWrap>{card.DEAL?.CONTACT?.NAME}</Typography>
          <Stack direction="row">
            <Typography variant="h2">{(Math.round((card.DEAL?.USR$AMOUNT || 0) * 100) / 100).toFixed(2)} Br</Typography>
            <Box flex={1} />
            <Typography variant="h2">
              {card.DEAL?.CREATIONDATE
                ? (new Date(card.DEAL.CREATIONDATE)).toLocaleString('default', { day: '2-digit', month: 'short' })
                : '-/-'}
            </Typography>
          </Stack>
          {deadLine}
          <TaskStatus tasks={card.TASKS ?? []} />
        </Stack>
      </CustomizedCard>
    );
  }, [card, snapshot.isDragging, addIsFetching]);

  return (
    <>
      {memoCard}
      {memoEditCard}
      {memoCopyCard}
    </>
  );
}

export default KanbanCard;

