import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders correctly', () => {
    render(<Logo />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
