import { render, screen } from '@/shared/testing/render';

import { DeliveriesScreen } from '../ui/deliveries-screen';

describe('<DeliveriesScreen />', () => {
  it('renders', () => {
    render(<DeliveriesScreen />);
    expect(screen.getByTestId('deliveries-screen')).toBeOnTheScreen();
  });
});
