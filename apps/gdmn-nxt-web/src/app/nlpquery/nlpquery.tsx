import { INLPToken, Language } from '@gsbelarus/util-api-types';
import Grid from '@mui/material/Grid/Grid';
import Stack from '@mui/material/Stack/Stack';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParseTextQuery } from '../features/nlp/nlpApi';
import { NLPState } from '../features/nlp/nlpSlice';
import { NLPSentenceTree } from '../nlpsentence-tree/nlpsentence-tree';
import { RootState } from '../store';
import styles from './nlpquery.module.less';

/* eslint-disable-next-line */
export interface NLPQueryProps {}

export function NLPQuery(props: NLPQueryProps) {
  const { nlpDialog } = useSelector<RootState, NLPState>( state => state.nlp );
  const [token, setToken] = useState<INLPToken | undefined>();

  let text = '';
  let language: Language = 'en';
  let command;

  for (let i = nlpDialog.length - 1; !text && i >= 0; i--) {
    if (nlpDialog[i].who === 'me') {
      text = nlpDialog[i].text;
      language = nlpDialog[i].language;
      command = nlpDialog[i].command;
    }
  }

  const { data, error, isFetching } = useParseTextQuery({
    version: '1.0',
    session: '123',
    language,
    text
  }, { skip: !text || !!command });

  useEffect( () => {
    if (!token && data?.sents[0]?.tokens[0]) {
      setToken(data?.sents[0]?.tokens[0])
    }
  }, [data]);

  const getMorphRow = (token?: INLPToken) => {
    const c: ([string, string] | null)[] = token?.morph ? Object.entries(token.morph) : [];
    while (c.length < 8) {
      c.push(null);
    }
    return c.map( m => m ? <td><span>{m[0]}{':'}</span>{m[1]}</td> : <td>&nbsp;</td> );
  };

  return (
    <Grid container height="100%" columnSpacing={2}>
      <Grid item xs={8}>
        <Stack width="100%" direction="row" flexWrap="wrap" gap={1} paddingTop={1}>
          {data?.sents[0]?.tokens.map(
            t =>
              <span key={t.id} className={styles[t === token ? 'selected' : 'word']} onClick={ () => setToken(t) }>
                {t.token}
              </span>
          )}
        </Stack>

        <table className={styles['table']}>
          <tbody>
            <tr>
              <td>
                <span>Token:</span>{token?.token}
              </td>
              <td>
                <span>Lemma:</span>{token?.lemma}
              </td>
              <td>
                <span>POS:</span>{token?.pos}
              </td>
              <td>
                <span>Tag:</span>{token?.tag}
              </td>
              <td>
                <span>Dep:</span>{token?.dep}
              </td>
              <td>
                <span>Shape:</span>{token?.shape}
              </td>
              <td>
                <span>Stop:</span>{token?.is_stop ? '☑' : '☐'}
              </td>
              <td>
                <span>Alpha:</span>{token?.is_alpha ? '☑' : '☐'}
              </td>
            </tr>
            <tr>
              {getMorphRow(token)}
            </tr>
          </tbody>
        </table>
        {
          data?.sents[0]
          &&
          <NLPSentenceTree
            nlpSentence={data.sents[0]}
            selectedToken={token}
            onClick={ id => setToken(data?.sents[0].tokens.find( t => t.id.toString() === id )) }
          />
        }
      </Grid>
      <Grid item xs={4}>
        <div className={styles['container']}>
          <pre className={styles['pre']}>
            {
              isFetching ?
                'Fetching...'
              :
              JSON.stringify(data ?? error, undefined, 2)
            }
          </pre>
        </div>
      </Grid>
    </Grid>
  );
};
