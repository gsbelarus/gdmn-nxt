import styles from './customized-scroll-box.module.less';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { styled } from '@mui/styles';
import { ReactNode } from 'react';
import PerfectScrollbar, { ScrollBarProps } from 'react-perfect-scrollbar';

export interface CustomizedScrollBoxProps extends ScrollBarProps {
  children: ReactNode;
}

const CustomizedScrollBox = (props: CustomizedScrollBoxProps) => {
  const { children } = props;
  return (
    <div
      aria-label="CustomizedScrollBox"
      className={styles.container}
    >
      <div
        className={styles.scrollBox}
      >
        <PerfectScrollbar>
          {children}
        </PerfectScrollbar>
      </div>
    </div>
  );
};


export default CustomizedScrollBox;
