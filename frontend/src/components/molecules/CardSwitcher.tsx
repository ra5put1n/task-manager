import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Colors, Spacing, Typography } from '../../styles'
import { checkboxSize } from '../../styles/dimensions'
import { TOverviewItem } from '../../utils/types'
import GTShadowContainer from '../atoms/GTShadowContainer'
import MarkTaskDoneButton from '../atoms/buttons/MarkTaskDoneButton'
import useOverviewLists from '../overview/useOverviewLists'

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    ${Typography.body};
    color: ${Colors.text.light};
    margin-bottom: ${Spacing._16};
`
const CardHeader = styled.div`
    display: flex;
    gap: ${Spacing._16};
    align-items: center;
    margin-bottom: ${Spacing._24};
`
const CardBody = styled.div`
    white-space: pre-wrap;
    margin-left: calc(${checkboxSize.parentContainer} + ${Spacing._16});
`
const SwitchText = styled.div`
    color: ${Colors.text.purple};
    cursor: pointer;
    user-select: none;
`
const mod = (n: number, m: number) => {
    return ((n % m) + m) % m
}
interface CardSwitcherProps {
    viewId: string
}

const CardSwitcher = ({ viewId }: CardSwitcherProps) => {
    const { lists } = useOverviewLists()
    const [cardIndex, setCardIndex] = useState(0)
    const [card, setCard] = useState<TOverviewItem | null>(null)

    useEffect(() => {
        const list = lists?.find(({ id }) => id === viewId)
        if (list == null) return
        if (cardIndex >= list.view_item_ids.length) {
            setCardIndex(0)
            setCard(list.view_items[0])
        } else {
            setCard(list.view_items[cardIndex])
        }
    }, [cardIndex, viewId, lists])

    const list = lists?.find(({ id }) => id === viewId)
    if (!list || list.view_item_ids.length === 0) return null
    if (card == null) return null
    return (
        <div>
            <Header>
                <SwitchText onClick={() => setCardIndex(mod(cardIndex - 1, list.view_item_ids.length))}>
                    Previous
                </SwitchText>
                <div>
                    Task {cardIndex + 1} of {list.view_item_ids.length}
                </div>
                <SwitchText onClick={() => setCardIndex(mod(cardIndex + 1, list.view_item_ids.length))}>
                    Next
                </SwitchText>
            </Header>
            <GTShadowContainer>
                <CardHeader>
                    <MarkTaskDoneButton isDone={card.is_done} taskId={card.id} isSelected={false} />
                    {card.title}
                </CardHeader>
                <CardBody>{card.body}</CardBody>
            </GTShadowContainer>
        </div>
    )
}

export default CardSwitcher
