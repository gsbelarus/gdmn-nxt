import { INLPSentence, INLPToken } from '@gsbelarus/util-api-types';
import { Edge as DagreEdge, graphlib, layout } from 'dagre';
import styles from './nlpsentence-tree.module.less';

interface IRectProps {
  readonly text: string;
  readonly explain: string | null;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly border: number;
  readonly className: string;
  readonly onClick?: () => void;
};

const Rect = ({ x, y, width, height, text, explain, border, className, onClick }: IRectProps) => {
  const cx = x + width / 2;
  const cy = y + height / 2;

  return (
    <g>
      <title>{explain}</title>
      <rect x={x} y={y} rx={4} ry={4} width={width} height={height} className={styles["outerRect"]} onClick={onClick} />
      <rect x={x + border} y={y + border} rx={4} ry={4} width={width - border * 2} height={height - border * 2} className={styles[className]} onClick={onClick} />
      <text x={cx} y={cy + 4} textAnchor="middle" onClick={onClick}>
        {text}
      </text>
    </g>
  );
};

interface IEdgeProps {
  label: string;
  explain: string | null;
  points: Array<{ x: number; y: number }>;
};

const Edge = ({ label, explain, points }: IEdgeProps) => {
  const first = points[0];
  const last = points[points.length - 1];
  const d = `M ${first.x} ${first.y} L ${last.x} ${last.y - 2}`;
  const width = label.length * 8 + 4;
  const height = 18;
  const xc = first.x <= last.x
    ? Math.floor((last.x - first.x) / 2) + first.x
    : Math.floor((first.x - last.x) / 2) + last.x;
  const yc = first.y <= last.y
    ? Math.floor((last.y - first.y) / 2) + first.y
    : Math.floor((first.y - last.y) / 2) + last.y;
  const x = xc - Math.floor(width / 2);
  const y = yc - Math.floor(height / 2);
  return (
    <>
      <path d={d} markerEnd="url(#arrow)" />
      <a href={`https://universaldependencies.org/u/dep/all.html`} target="_blank">
        <title>{explain}</title>
        <rect x={x} y={y} rx={4} ry={4} width={width} height={height} className={styles["outerDep"]} />
        <rect x={x + 1} y={y + 1} rx={4} ry={4} width={width - 2} height={height - 2} className={styles["dep"]} />
        <text x={xc} y={yc + 4} textAnchor="middle" className={styles["dep"]}>
          {label}
        </text>
      </a>
    </>
  );
};

/* eslint-disable-next-line */
export interface NLPSentenceTreeProps {
  nlpSentence: INLPSentence;
  selectedToken?: INLPToken;
  onClick?: (id: string) => void;
}

export function NLPSentenceTree({ nlpSentence, selectedToken, onClick }: NLPSentenceTreeProps) {

  const selectedId = selectedToken?.id.toString();

  // Create a new directed graph
  const g = new graphlib.Graph();

  // Set an object for the graph label
  g.setGraph({});

  // Default to assigning a new object as a label for each new edge.
  g.setDefaultEdgeLabel(() => {
    return {};
  });

  const recurs = (token?: INLPToken) => {
    if (token) {
      const label = `${token.pos}:${token.token}`;
      g.setNode(token.id.toString(), {
        label,
        explain: token.pos_explain,
        width: label.length * 9 + 8,
        height: 26,
        className: token.id === selectedToken?.id ? 'selected' : 'word'
      });
      nlpSentence.tokens
        .filter( t => t.head?.id === token.id )
        .forEach( t => {
          g.setEdge(token.id.toString(), t.id.toString(), {
            label: t.dep,
            explain: t.dep_explain
          });
          recurs(t);
        });
    }
  };

  recurs(nlpSentence.tokens.find( t => t.dep === 'ROOT' ));

  g.graph().ranksep = 40;
  g.graph().marginx = 2;
  g.graph().marginy = 2;
  layout(g);

  const makeRect = (n: string, idx: number) => {
    const nd = g.node(n) as any;
    if (!nd) return null;

    const x = nd.x - nd.width / 2;
    const y = nd.y - nd.height / 2;
    return (
      <Rect
        key={idx}
        x={x}
        y={y}
        width={nd.width}
        height={nd.height}
        text={nd.label}
        explain={nd.explain}
        border={selectedId === n ? 2 : 1}
        className={nd.className}
        onClick={ () => { onClick && onClick(n) } }
      />
    );
  };

  const makeEdge = (e: DagreEdge, idx: number) =>
    <Edge
      key={idx}
      points={g.edge(e).points}
      label={g.edge(e).label}
      explain={g.edge(e).explain}
    />;

  return (
    <div className={styles["CommandAndGraph"]}>
      {g.graph() ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={g.graph().width}
          height={g.graph().height}
          viewBox={'0 0 ' + g.graph().width + ' ' + g.graph().height}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerUnits="strokeWidth"
              markerWidth="8"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 Z" style={{ strokeWidth: '1', fill: 'darkgray' }} />
            </marker>
            <marker
              id="arrow2"
              viewBox="0 0 10 10"
              refX="0"
              refY="5"
              markerUnits="strokeWidth"
              markerWidth="8"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 10 0 L 0 5 L 10 10 Z" style={{ strokeWidth: '1' }} />
            </marker>
          </defs>
          <g>
            {g.nodes().map((n, idx) => makeRect(n, idx))}
            {g.edges().map((e, idx) => makeEdge(e, idx))}
          </g>
        </svg>
      ) : null}
    </div>
  );
};
