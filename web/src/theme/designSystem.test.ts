import { commandCenterCardSx } from './designSystem';

describe('command center surface', () => {
  it('does not fill the hero with a solid purple wash', () => {
    expect(commandCenterCardSx.background).toBe('var(--rq-surface)');
    expect(commandCenterCardSx.backgroundImage).toBe('none');
  });
});
