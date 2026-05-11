import React from 'react'
import { render, screen } from '@testing-library/react'
import CarpetaCover from './CarpetaCover'

describe('CarpetaCover Component', () => {
  const mockCfg = {
    location: 'Test Location',
    name: 'Test Project',
    zone: 'Test Zone',
    coverImage: '/test-image.jpg',
  }

  it('renders correctly with fallback translations when t is not provided', () => {
    render(<CarpetaCover cfg={mockCfg} agentName="Jane Doe" />)
    
    // Check if the fallback title is rendered
    expect(screen.getByText('STRATEGIC ASSET VALUATION')).toBeInTheDocument()
    
    // Check if location is rendered
    expect(screen.getByText('Test Location')).toBeInTheDocument()
    
    // Check if agent name is rendered
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders correctly with provided translations and agent photo', () => {
    const mockT = jest.fn((key) => {
      if (key === 'pre_carpeta_title') return 'Translated Valuation'
      return key
    })

    render(
      <CarpetaCover 
        cfg={mockCfg} 
        agentName="John Smith" 
        agentPhoto="/john-photo.jpg" 
        t={mockT} 
      />
    )
    
    // Check if translated title is rendered
    expect(screen.getByText('Translated Valuation')).toBeInTheDocument()
    
    // Check if photo is rendered with correct alt text
    const photo = screen.getByAltText('John Smith')
    expect(photo).toBeInTheDocument()
    expect(photo).toHaveAttribute('src', '/john-photo.jpg')
  })
})
