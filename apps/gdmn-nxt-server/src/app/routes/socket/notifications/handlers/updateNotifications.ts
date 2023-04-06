import { resultError } from '../../../../responseMessages';
import { startTransaction } from '../../../../utils/db-connection';

export const updateNotifications = async (sessionId: string) => {
  const { releaseTransaction, fetchAsObject } = await startTransaction(sessionId);

  try {
    const sql = `
      EXECUTE BLOCK
      RETURNS (SUCCESS SMALLINT)
      AS
        DECLARE VARIABLE CONTACTKEY TYPE OF COLUMN GD_CONTACT.ID;
        DECLARE VARIABLE MESSAGE TYPE OF COLUMN USR$CRM_NOTIFICATIONS.USR$MESSAGE;
        DECLARE VARIABLE DEAL_ID TYPE OF COLUMN USR$CRM_DEALS.ID;
        DECLARE VARIABLE DEAL_CREATIONDATE TYPE OF COLUMN USR$CRM_DEALS.USR$CREATIONDATE;
        DECLARE VARIABLE DEAL_DEADLINE TYPE OF COLUMN USR$CRM_DEALS.USR$DEADLINE;
        DECLARE VARIABLE DEAL_NUMBER TYPE OF COLUMN USR$CRM_DEALS.USR$NUMBER;
        DECLARE VARIABLE DEAL_NAME TYPE OF COLUMN USR$CRM_DEALS.USR$NAME;
        DECLARE VARIABLE TASK_ID TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.ID;
        DECLARE VARIABLE TASK_CREATIONDATE TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$CREATIONDATE;
        DECLARE VARIABLE TASK_DEADLINE TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$DEADLINE;
        DECLARE VARIABLE TASK_NAME TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$NAME;
        DECLARE DAYS_FOR_WITHOUT_DEADLINE SMALLINT = 10;
        DECLARE TIME_FOR_DELETE_DELAYED SMALLINT = 60;
        DECLARE USERKEY TYPE OF COLUMN GD_USER.ID;
      BEGIN
        /** Удалить все просроченные помеченные на удаление уведомления всех пользователей*/
        DELETE FROM USR$CRM_NOTIFICATIONS
        WHERE
          USR$DELAYED = 1
          AND DATEDIFF(MINUTE FROM EDITIONDATE TO CURRENT_TIMESTAMP) >= :TIME_FOR_DELETE_DELAYED;

        FOR SELECT ID, CONTACTKEY
        FROM GD_USER
        WHERE
          DISABLED = 0
        INTO :USERKEY, :CONTACTKEY
        DO
        BEGIN
          /** Создать уведомления по сделкам данного пользователя*/
          FOR SELECT d.ID, d.USR$NUMBER, d.USR$NAME, D.USR$CREATIONDATE, d.USR$DEADLINE
          FROM USR$CRM_DEALS d
          WHERE
            :CONTACTKEY IN (d.USR$CREATORKEY, d.USR$PERFORMER)
            AND d.USR$DONE = 0 AND d.USR$DENIED = 0
          ORDER BY d.USR$NUMBER
          INTO :DEAL_ID, :DEAL_NUMBER, :DEAL_NAME, :DEAL_CREATIONDATE, :DEAL_DEADLINE
          DO
          BEGIN
            MESSAGE = CASE
            WHEN (DEAL_DEADLINE IS NOT NULL AND DATEDIFF(DAY FROM CURRENT_DATE TO DEAL_DEADLINE) < 0) THEN
              'Сделка №' || DEAL_NUMBER || ' **' || DEAL_NAME || '** просрочена на **' || ABS(DATEDIFF(DAY FROM CURRENT_DATE TO DEAL_DEADLINE)) || ' дней**'
            WHEN (DEAL_DEADLINE IS NOT NULL AND DATEDIFF(DAY FROM CURRENT_DATE TO DEAL_DEADLINE) = 0) THEN
              '**Сегодня истекает** срок закрытия сделки №' || DEAL_NUMBER || ' **' || DEAL_NAME || '**'
            WHEN (DEAL_DEADLINE IS NOT NULL AND DATEDIFF(DAY FROM CURRENT_DATE TO DEAL_DEADLINE) = 1) THEN
              'Остался **1 день** до окончания срока закрытия сделки №' || DEAL_NUMBER || ' **' || DEAL_NAME || '**'
            WHEN (DEAL_DEADLINE IS NULL AND DATEDIFF(DAY FROM DEAL_CREATIONDATE TO CURRENT_DATE) >= DAYS_FOR_WITHOUT_DEADLINE) THEN
              'Сделка №' || DEAL_NUMBER || ' **' || DEAL_NAME || '**' || ' не закрыта уже **' || DATEDIFF(DAY FROM CURRENT_DATE TO DEAL_CREATIONDATE) || ' дней**'
            ELSE ''
            END;

            IF (MESSAGE != '') THEN
              UPDATE OR INSERT INTO USR$CRM_NOTIFICATIONS(USR$USERKEY, USR$TITLE, USR$MESSAGE, USR$KEY)
              VALUES(:USERKEY, 'Напоминание', :MESSAGE, :DEAL_ID)
              MATCHING(USR$USERKEY, USR$KEY);
          END

          /** Создать уведомления по задачам сделок данного пользователя*/
          FOR SELECT
            task.ID, d.USR$NUMBER, d.USR$NAME, task.USR$NAME, task.USR$CREATIONDATE, task.USR$DEADLINE
          FROM USR$CRM_DEALS d
          JOIN USR$CRM_KANBAN_CARDS card ON card.USR$DEALKEY = d.ID
          JOIN USR$CRM_KANBAN_CARD_TASKS task ON task.USR$CARDKEY = card.ID
          WHERE
            :CONTACTKEY IN (task.USR$CREATORKEY, task.USR$PERFORMER)
            AND d.USR$DONE = 0 AND d.USR$DENIED = 0 AND task.USR$CLOSED = 0
          ORDER BY d.USR$NUMBER
          INTO :TASK_ID, :DEAL_NUMBER, :DEAL_NAME, :TASK_NAME, :TASK_CREATIONDATE, :TASK_DEADLINE
          DO
          BEGIN
            MESSAGE = CASE
            WHEN (TASK_DEADLINE IS NOT NULL AND DATEDIFF(DAY FROM CURRENT_DATE TO TASK_DEADLINE) < 0) THEN
              'Задача **' || TASK_NAME || '** по сделке **' || DEAL_NAME || '** просрочена на **' || ABS(DATEDIFF(DAY FROM CURRENT_DATE TO TASK_DEADLINE)) || ' дней**'
            WHEN (TASK_DEADLINE IS NOT NULL AND DATEDIFF(DAY FROM CURRENT_DATE TO TASK_DEADLINE) = 0) THEN
              '**Сегодня истекает** срок закрытия задачи **' || TASK_NAME || '** по сделке №' || DEAL_NUMBER || ' **' || DEAL_NAME || '**'
            WHEN (TASK_DEADLINE IS NOT NULL AND DATEDIFF(DAY FROM CURRENT_DATE TO TASK_DEADLINE) = 1) THEN
              'Остался **1 день** до окончания срока выполнения задачи **'|| TASK_NAME ||'** сделки №' || DEAL_NUMBER || ' **' || DEAL_NAME || '**'
            WHEN (TASK_DEADLINE IS NULL AND DATEDIFF(DAY FROM TASK_CREATIONDATE TO CURRENT_DATE) >= DAYS_FOR_WITHOUT_DEADLINE) THEN
              'Ваша задача **' || TASK_NAME ||'** по сделке №' || DEAL_NUMBER || ' **' || DEAL_NAME || '**' || ' не закрыта уже **' || DATEDIFF(DAY FROM CURRENT_DATE TO TASK_CREATIONDATE) || ' дней**'
            ELSE ''
            END;

            IF (MESSAGE != '') THEN
              UPDATE OR INSERT INTO USR$CRM_NOTIFICATIONS(USR$USERKEY, USR$TITLE, USR$MESSAGE, USR$KEY)
              VALUES(:USERKEY, 'Напоминание', :MESSAGE, :TASK_ID)
              MATCHING(USR$USERKEY, USR$KEY);
          END
        END
      END`;

    await fetchAsObject(sql);
    await releaseTransaction();
  } catch (error) {
    console.error('updateNotifications', error);
    await releaseTransaction(false);
  } finally {
  };
};
