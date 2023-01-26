import { CardContent, Grid } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CardHeader, Typography, Divider, Button, IconButton, CircularProgress } from '@mui/material';
import style from './faq.module.less';
import * as React from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import PerfectScrollbar from 'react-perfect-scrollbar';
import CustomizedCard from '../../components/Styled/customized-card/customized-card';
import EditIcon from '@mui/icons-material/Edit';
import Popup from './popup/popup';
import { faqApi, fullFaq } from '../../features/FAQ/faqApi';

export default function FAQ() {
  const { data: faqs, isFetching } = faqApi.useGetAllfaqsQuery();
  const [expanded, setExpanded] = React.useState<string | false>(false);
  const [isOpenedEditPopup, setIsOpenedEditPopup] = React.useState<boolean>(false);
  const [isOpenedAddPopup, setIsOpenedAddPopup] = React.useState<boolean>(false);
  const [faq, setFaq] = useState<fullFaq>();
  const [addFaq, addFaqObj] = faqApi.useAddfaqMutation();
  const [editFaq, editFaqObj] = faqApi.useEditFaqMutation();
  const [deleteFaq, deleteFaqObj] = faqApi.useDeleteFaqMutation();

  const addFaqHandler = (question:string, answer:string) => {
    addFaq({ 'USR$QUESTION': question, 'USR$ANSWER': answer });
  };
  const editFaqHandler = (question:string, answer:string, id:number) => {
    editFaq([{ 'USR$QUESTION': question, 'USR$ANSWER': answer }, id]);
  };
  const deleteFaqHandler = (id:number) => {
    deleteFaq(id);
  };

  const handleOpenAddPopup = () => {
    setIsOpenedAddPopup(true);
  };

  const handleCloseAddPopup = ():void => {
    setIsOpenedAddPopup(false);
  };

  const handleOpenEditPopup = (editableFaq: fullFaq) => () => {
    setFaq(editableFaq);
    setIsOpenedEditPopup(true);
  };

  const handleCloseEditPopup = () => {
    setIsOpenedEditPopup(false);
  };

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (isFetching) {
    return (
      <div className={style.preloadevBody}>
        <CircularProgress size={100} />
      </div>
    );
  }
  return (
    <>
      <Popup
        close={handleCloseEditPopup}
        isOpened={isOpenedEditPopup}
        isAddPopup={false}
        faq={faq}
        editFaq={editFaqHandler}
        deleteFaq={deleteFaqHandler}
      />
      <Popup
        close={handleCloseAddPopup}
        isOpened={isOpenedAddPopup}
        isAddPopup={true}
        addFaq={addFaqHandler}
      />
      <div className={style.body} >
        <CustomizedCard borders className={style.card}>
          <CardHeader
            title={
              <div className={style.title}>
                <Typography variant="h3">
                  Часто задаваемые вопросы
                </Typography>
                <Button disabled={addFaqObj.isLoading} variant="contained" onClick={handleOpenAddPopup}>Добавить</Button>
              </div>
            }
          />
          <CardContent>
            <div className={style.scrollBarContainer}>
              <PerfectScrollbar className={style.scrollBar}>
                <Grid item xs={12}>
                  {
                    faqs?.map(item =>
                      <div key={item.ID}>
                        {faqs?.indexOf(item) !== 0 && <Divider/>}
                        <div className={style.faqList}>
                          <Accordion
                            expanded={expanded === `panel${item.ID}`}
                            onChange={handleChange(`panel${item.ID}`)}
                            className={style.accordion}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              aria-controls="panel1a-content"
                              id="panel1a-header"
                            >
                              <ReactMarkdown>
                                {
                                  item.USR$QUESTION
                                }
                              </ReactMarkdown>
                            </AccordionSummary>
                            <AccordionDetails className={style.answerField}>
                              <ReactMarkdown >
                                {
                                  item.USR$ANSWER
                                }
                              </ReactMarkdown>
                            </AccordionDetails>
                          </Accordion>
                          <div>
                            <IconButton
                              disabled={deleteFaqObj.isLoading || editFaqObj.isLoading}
                              className={style.changeButton}
                              onClick={handleOpenEditPopup(item)}
                              aria-label="Изменить"
                            >
                              <EditIcon />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    )
                  }
                </Grid>
              </PerfectScrollbar>
            </div>
          </CardContent>
        </CustomizedCard>
      </div>
    </>
  );
};