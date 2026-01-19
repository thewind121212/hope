import { render, screen } from '@testing-library/react';
import MarqueeText from '@voc/components/ui/MarqueeText';

describe('MarqueeText', () => {
  it('should render children correctly', () => {
    render(<MarqueeText>Test Text</MarqueeText>);

    expect(screen.getByText('Test Text')).toBeInTheDocument();
  });

  it('should apply overflow-hidden class to container', () => {
    const { container } = render(<MarqueeText>Test</MarqueeText>);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-hidden');
  });

  it('should apply whitespace-nowrap class to container', () => {
    const { container } = render(<MarqueeText>Test</MarqueeText>);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('whitespace-nowrap');
  });

  it('should apply inline-block class to span', () => {
    const { container } = render(<MarqueeText>Test</MarqueeText>);

    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span?.className).toContain('inline-block');
  });

  it('should apply hover:animate-marquee class', () => {
    const { container } = render(<MarqueeText>Test</MarqueeText>);

    const span = container.querySelector('span');
    expect(span?.className).toContain('hover:animate-marquee');
  });

  it('should apply motion-reduce:hover:animate-none class for reduced motion', () => {
    const { container } = render(<MarqueeText>Test</MarqueeText>);

    const span = container.querySelector('span');
    expect(span?.className).toContain('motion-reduce:hover:animate-none');
  });

  it('should apply motion-reduce:hover:underline class for reduced motion fallback', () => {
    const { container } = render(<MarqueeText>Test</MarqueeText>);

    const span = container.querySelector('span');
    expect(span?.className).toContain('motion-reduce:hover:underline');
  });

  it('should handle long text content', () => {
    const longText = 'This is a very long text that should overflow the container';
    render(<MarqueeText>{longText}</MarqueeText>);

    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('should handle special characters', () => {
    const specialText = 'Special: <>&"\'';
    render(<MarqueeText>{specialText}</MarqueeText>);

    expect(screen.getByText('Special: <>&"\'')).toBeInTheDocument();
  });

  it('should handle empty text', () => {
    const { container } = render(<MarqueeText></MarqueeText>);

    const span = container.querySelector('span');
    expect(span?.textContent).toBe('');
  });

  it('should handle React nodes as children', () => {
    render(
      <MarqueeText>
        <strong>Bold Text</strong>
      </MarqueeText>
    );

    expect(screen.getByText('Bold Text')).toBeInTheDocument();
    expect(screen.getByText('Bold Text').tagName).toBe('STRONG');
  });
});
