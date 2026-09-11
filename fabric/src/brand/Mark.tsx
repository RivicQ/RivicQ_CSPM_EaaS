import React from 'react';
import markUrl from './rivicq-mark.svg';

/** Official RivicQ mark: geometric R on a rounded black square. */
const Mark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <img src={markUrl} width={size} height={size} alt="RivicQ" style={{ display: 'block', borderRadius: '22%' }} />
);

export default Mark;
