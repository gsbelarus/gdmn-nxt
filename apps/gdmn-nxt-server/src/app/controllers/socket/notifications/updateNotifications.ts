import { startTransaction } from '@gdmn-nxt/db-connection';

export const updateNotifications = async (sessionId: string) => {
  const { releaseTransaction, fetchAsObject } = await startTransaction(sessionId);

  try {
    const sql = `
      EXECUTE BLOCK
      RETURNS (SUCCESS SMALLINT)
      AS
        DECLARE BREAK_LINE VARCHAR(4) = '\n\n';
        DECLARE DAYS_FOR_WITHOUT_DEADLINE SMALLINT = 10;
        DECLARE TIME_FOR_DELETE_DELAYED SMALLINT = 60;
        DECLARE TIME_FOR_LAST_NOTIFICATION SMALLINT = 60;
        DECLARE DAYS_FOR_LAST_NOTIFICATION SMALLINT = 1;
        DECLARE MAX_LENGTH_FOR_TASK_DESCRIPTION SMALLINT = 65;
        DECLARE USERKEY TYPE OF COLUMN GD_USER.ID;
        DECLARE VARIABLE CONTACTKEY TYPE OF COLUMN GD_CONTACT.ID;
        DECLARE VARIABLE MESSAGE_TEXT TYPE OF COLUMN USR$CRM_NOTIFICATIONS.USR$MESSAGE;
        DECLARE VARIABLE DEAL_ID TYPE OF COLUMN USR$CRM_DEALS.ID;
        DECLARE VARIABLE DEAL_CREATIONDATE TYPE OF COLUMN USR$CRM_DEALS.USR$CREATIONDATE;
        DECLARE VARIABLE DEAL_DEADLINE TIMESTAMP;
        DECLARE VARIABLE DEAL_NUMBER TYPE OF COLUMN USR$CRM_DEALS.USR$NUMBER;
        DECLARE VARIABLE DEAL_NAME TYPE OF COLUMN USR$CRM_DEALS.USR$NAME;
        DECLARE VARIABLE DEAL_PERFORMER VARCHAR(200);
        DECLARE VARIABLE TASK_ID TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.ID;
        DECLARE VARIABLE TASK_CREATIONDATE TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$CREATIONDATE;
        DECLARE VARIABLE TASK_DEADLINE TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$DEADLINE;
        DECLARE VARIABLE TASK_NAME TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$NAME;
        DECLARE VARIABLE TASK_NUMBER TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS.USR$NUMBER;
        DECLARE VARIABLE TASK_TYPE_NAME TYPE OF COLUMN USR$CRM_KANBAN_CARD_TASKS_TYPES.USR$NAME;
        DECLARE VARIABLE TASK_PERFORMER_NAME TYPE OF COLUMN GD_CONTACT.NAME;
        DECLARE VARIABLE IN_PROGRESS SMALLINT;
        DECLARE VARIABLE TITLE TYPE OF COLUMN USR$CRM_NOTIFICATIONS.USR$TITLE;
        DECLARE VARIABLE MESSAGE_DATE TYPE OF COLUMN USR$CRM_NOTIFICATIONS.USR$ONDATE;
        DECLARE VARIABLE DEADLINE_TIME TIME;
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
          FOR SELECT
            d.ID, d.USR$NUMBER, d.USR$NAME, D.USR$CREATIONDATE, d.USR$DEADLINE, d.USR$READYTOWORK,
            CASE
            WHEN :CONTACTKEY = d.USR$CREATORKEY THEN
              '**Исполнитель:** ' || CASE
              WHEN performer_1.ID IS NOT NULL AND performer_2.ID IS NULL THEN performer_1.NAME
              WHEN performer_1.ID IS NULL AND performer_2.ID IS NOT NULL THEN performer_2.NAME
              WHEN performer_1.ID IS NOT NULL AND performer_2.ID IS NOT NULL THEN performer_1.NAME || ', ' || performer_2.NAME
              ELSE 'не указан'
              END
            WHEN :CONTACTKEY IN (d.USR$PERFORMER, d.USR$SECOND_PERFORMER)  THEN '**Постановщик:** ' || creator.NAME
            END
          FROM USR$CRM_DEALS d
          LEFT JOIN GD_CONTACT creator ON creator.ID = d.USR$CREATORKEY
          LEFT JOIN GD_CONTACT performer_1 ON performer_1.ID = d.USR$PERFORMER
          LEFT JOIN GD_CONTACT performer_2 ON performer_2.ID = d.USR$SECOND_PERFORMER
          WHERE
            :CONTACTKEY IN (d.USR$CREATORKEY, d.USR$PERFORMER, d.USR$SECOND_PERFORMER)
            AND d.USR$DONE = 0 AND d.USR$DENIED = 0
          ORDER BY d.USR$NUMBER
          INTO :DEAL_ID, :DEAL_NUMBER, :DEAL_NAME, :DEAL_CREATIONDATE, :DEAL_DEADLINE, :IN_PROGRESS, :DEAL_PERFORMER
          DO
          BEGIN
            DEADLINE_TIME = IIF(DATEDIFF (MINUTE FROM TIME '0:00' TO CAST(DEAL_DEADLINE AS TIME)) = 0, NULL, CAST(DEAL_DEADLINE AS TIME));

            MESSAGE_DATE = DEAL_DEADLINE;
            TITLE = '';
            IF (IN_PROGRESS = 0) THEN
            BEGIN
              TITLE = 'Новая сделка';
              MESSAGE_DATE = DEAL_CREATIONDATE;
            END

            IF (IN_PROGRESS = 1) THEN
              TITLE = CASE
              WHEN (DEADLINE_TIME IS NOT NULL AND
                    DATEDIFF(DAY FROM CURRENT_DATE TO DEAL_DEADLINE) < 0) THEN
                'Просроченная сделка'
              WHEN (DEADLINE_TIME IS NOT NULL AND
                    (DATEDIFF(MINUTE FROM CURRENT_TIMESTAMP TO DEAL_DEADLINE) <= TIME_FOR_LAST_NOTIFICATION)) THEN
                'Пора выполнить сделку'
              WHEN (DEADLINE_TIME IS NULL AND
                    (DATEDIFF(DAY FROM CURRENT_TIMESTAMP TO DEAL_DEADLINE) <= DAYS_FOR_LAST_NOTIFICATION)) THEN
                'Пора выполнить сделку'
              ELSE ''
              END;
            MESSAGE_TEXT = DEAL_NAME;

            IF (CHAR_LENGTH(MESSAGE_TEXT) > MAX_LENGTH_FOR_TASK_DESCRIPTION + 5) THEN
              MESSAGE_TEXT = SUBSTRING(MESSAGE_TEXT FROM 1 FOR MAX_LENGTH_FOR_TASK_DESCRIPTION) || ' ...';

              MESSAGE_TEXT = MESSAGE_TEXT || BREAK_LINE || DEAL_PERFORMER;

            IF (TITLE != '' AND MESSAGE_TEXT != '') THEN
              UPDATE OR INSERT INTO USR$CRM_NOTIFICATIONS(USR$USERKEY, USR$TITLE, USR$MESSAGE, USR$KEY, USR$ACTIONTYPE, USR$ACTIONCONTENT, USR$ONDATE)
              VALUES(:USERKEY, :TITLE, :MESSAGE_TEXT, :DEAL_ID, 1, :DEAL_NUMBER, :MESSAGE_DATE)
              MATCHING(USR$USERKEY, USR$KEY);
          END

          /** Создать уведомления по задачам сделок данного пользователя*/
          FOR SELECT
            task.ID,
            task.USR$NUMBER,
            d.USR$NUMBER,
            d.USR$NAME,
            task.USR$NAME,
            task.USR$CREATIONDATE,
            task.USR$DEADLINE,
            COALESCE(taskType.USR$NAME, 'Выполнить'),
            COALESCE(task.USR$INPROGRESS, 0),
            CASE
            WHEN :CONTACTKEY = task.USR$CREATORKEY THEN
              '**Исполнитель:** ' || COALESCE(performer.NAME, 'не указан')
            WHEN :CONTACTKEY = task.USR$PERFORMER THEN
              '**Постановщик:** ' || creator.NAME
            END
          FROM USR$CRM_DEALS d
          JOIN USR$CRM_KANBAN_CARDS card ON card.USR$DEALKEY = d.ID
          JOIN USR$CRM_KANBAN_CARD_TASKS task ON task.USR$CARDKEY = card.ID
          LEFT JOIN USR$CRM_KANBAN_CARD_TASKS_TYPES taskType ON taskType.ID = task.USR$TASKTYPEKEY
          LEFT JOIN GD_CONTACT creator ON creator.ID = task.USR$CREATORKEY
          LEFT JOIN GD_CONTACT performer ON performer.ID = task.USR$PERFORMER
          WHERE
            :CONTACTKEY IN (task.USR$CREATORKEY, task.USR$PERFORMER)
            AND d.USR$DONE = 0 AND d.USR$DENIED = 0 AND task.USR$CLOSED = 0
          ORDER BY d.USR$NUMBER
          INTO :TASK_ID, :TASK_NUMBER, :DEAL_NUMBER, :DEAL_NAME, :TASK_NAME,
              :TASK_CREATIONDATE, :TASK_DEADLINE, :TASK_TYPE_NAME, :IN_PROGRESS,
              :TASK_PERFORMER_NAME
          DO
          BEGIN
            DEADLINE_TIME = IIF(DATEDIFF (MINUTE FROM TIME '0:00' TO CAST(TASK_DEADLINE AS TIME)) = 0, NULL, CAST(TASK_DEADLINE AS TIME));

            MESSAGE_DATE = TASK_DEADLINE;
            TITLE = '';
            IF (IN_PROGRESS = 0) THEN
            BEGIN
              TITLE = 'Новая задача';
              MESSAGE_DATE = TASK_CREATIONDATE;
            END

            IF (IN_PROGRESS = 1) THEN
              TITLE = CASE
              WHEN (TASK_DEADLINE IS NOT NULL AND
                    DATEDIFF(DAY FROM CURRENT_DATE TO TASK_DEADLINE) < 0) THEN
                'Просроченная задача'
              WHEN (DEADLINE_TIME IS NOT NULL AND
                    (DATEDIFF(MINUTE FROM CURRENT_TIMESTAMP TO TASK_DEADLINE) <= TIME_FOR_LAST_NOTIFICATION)) THEN
                'Пора выполнить задачу'
              WHEN (DEADLINE_TIME IS NULL AND
                    (DATEDIFF(DAY FROM CURRENT_TIMESTAMP TO TASK_DEADLINE) <= DAYS_FOR_LAST_NOTIFICATION)) THEN
                'Пора выполнить задачу'
              ELSE ''
              END;

            MESSAGE_TEXT = '**' || TASK_TYPE_NAME || ':** ' || TASK_NAME;
            IF (CHAR_LENGTH(MESSAGE_TEXT) > MAX_LENGTH_FOR_TASK_DESCRIPTION + 5) THEN
              MESSAGE_TEXT = SUBSTRING(MESSAGE_TEXT FROM 1 FOR MAX_LENGTH_FOR_TASK_DESCRIPTION) || ' ...';

            MESSAGE_TEXT = MESSAGE_TEXT || BREAK_LINE || TASK_PERFORMER_NAME;

            IF (TITLE != '' AND MESSAGE_TEXT != '') THEN
              UPDATE OR INSERT INTO USR$CRM_NOTIFICATIONS(USR$USERKEY, USR$TITLE, USR$MESSAGE, USR$KEY, USR$ACTIONTYPE, USR$ACTIONCONTENT, USR$ONDATE)
              VALUES(:USERKEY, :TITLE, :MESSAGE_TEXT, :TASK_ID, 2, :TASK_NUMBER, :MESSAGE_DATE)
              MATCHING(USR$USERKEY, USR$KEY);
          END
        END
      END`;

    await fetchAsObject(sql);
    // await releaseTransaction();
  } catch (error) {
    console.error('updateNotifications', error);
    // await releaseTransaction(false);
  } finally {
    await releaseTransaction();
  };
};
