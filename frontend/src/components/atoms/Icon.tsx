import { createElement } from 'react'
import { SvgIconProps } from '@mui/material'
import styled from 'styled-components'
import { Colors, Dimensions } from '../../styles'

const IconContainer = styled.div<{ size: string }>`
    width: ${({ size }) => size};
    height: ${({ size }) => size};
    font-size: ${({ size }) => size};
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
`

const ImageContainer = styled.img`
    width: 100%;
    aspect-ratio: 1;
`

const iconColor = {
    white: '#FFFFFF',
    gray: '#717179',
    red: '#E24858',
    yellow: '#FFBA0D',
    blue: '#25BEFF',
    green: '#41802E',
    orange: '#FF8200',
    purple: '#5634CF',
    black: '#000000',
}

const iconSize = {
    small: '12px',
    default: '16px',
    medium: '32px',
    gtLogo: '64px',
    large: '50px',
}

type TIconSize = keyof typeof iconSize
type TIconColor = keyof typeof iconColor
export type TIconType = React.JSXElementConstructor<SvgIconProps> | string

interface IconProps {
    icon: TIconType
    size?: TIconSize
    color?: TIconColor
    colorHex?: string
    className?: string
    hidden?: boolean
}

export const Icon = ({ icon, size = 'default', color, colorHex, className, hidden }: IconProps) => {
    const dimension = Dimensions.iconSize[size]

    if (typeof icon === 'string')
        return (
            <IconContainer size={dimension} className={className}>
                {!hidden && <ImageContainer src={icon} />}
            </IconContainer>
        )

    const iconColor = color ? Colors.icon[color] : colorHex

    return createElement(icon, {
        sx: { color: iconColor, fontSize: dimension, visibility: hidden ? 'hidden' : 'visible' },
    })
}
