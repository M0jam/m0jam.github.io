import logoPng from '../assets/top-right-logo.png'

export function Logo({ className }: { className?: string }): JSX.Element {
  return <img src={logoPng} className={className} alt="PlayHub Logo" />
}
