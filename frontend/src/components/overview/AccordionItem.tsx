import { useLayoutEffect } from 'react'
import styled from 'styled-components'
import { DEFAULT_SECTION_ID } from '../../constants'
import useGetViewItems from '../../hooks/useGetViewItems'
import useGetVisibleItemCount from '../../hooks/useGetVisibleItemCount'
import { Border, Colors, Shadows, Spacing } from '../../styles'
import { TLogoImage, icons, logos } from '../../styles/images'
import { TOverviewView } from '../../utils/types'
import GTAccordionHeader from './AccordionHeader'
import AuthBanner from './AuthBanner'
import { PAGE_SIZE } from './OverviewViewContainer'
import { PaginateTextButton } from './styles'

const AccordionContainer = styled.div`
    margin-bottom: ${Spacing._8};
`
const Trigger = styled.div<{ isOpen: boolean }>`
    outline: none !important;
    user-select: none;
    width: 100%;
    box-sizing: border-box;
    background-color: ${Colors.background.white};
    padding: ${Spacing._16};
    display: flex;
    justify-content: space-between;
    border-radius: ${Border.radius.small};
    ${(props) => props.isOpen && `border-radius: ${Border.radius.small} ${Border.radius.small} 0 0;`}
    cursor: pointer;
    box-shadow: ${Shadows.button.default};
`

const ListContent = styled.div`
    padding: ${Spacing._16};
    background-color: ${Colors.background.white};
    border-radius: 0 0 ${Border.radius.small} ${Border.radius.small};
    box-shadow: ${Shadows.button.default};
`

export const getOverviewAccordionHeaderIcon = (logo: TLogoImage, sectionId?: string) => {
    if (logo !== 'generaltask') return logos[logo]
    return sectionId === DEFAULT_SECTION_ID ? icons.inbox : icons.folder
}

interface AccordionItemProps {
    list: TOverviewView
    openListIds: string[]
    setOpenListIds: React.Dispatch<React.SetStateAction<string[]>>
}
const AccordionItem = ({ list, openListIds, setOpenListIds }: AccordionItemProps) => {
    const ViewItems = useGetViewItems(list)
    const isOpen = openListIds.includes(list.id)
    const toggerAccordion = () => {
        if (isOpen) setOpenListIds(openListIds.filter((id) => id !== list.id))
        else setOpenListIds([...openListIds, list.id])
    }

    const [visibleItemsCount, setVisibleItemsCount] = useGetVisibleItemCount(list, list.id)
    const nextPageLength = Math.min(list.view_items.length - visibleItemsCount, PAGE_SIZE)

    useLayoutEffect(() => {
        if (!openListIds.includes(list.id)) return
        if (list.view_items.length === 0) {
            setOpenListIds((ids) => ids.filter((id) => id !== list.id))
        }
    }, [list.view_items.length])

    return (
        <AccordionContainer>
            <Trigger onClick={toggerAccordion} isOpen={isOpen}>
                <GTAccordionHeader list={list} isOpen={isOpen} />
            </Trigger>
            {isOpen && (
                <ListContent>
                    {list.is_linked ? (
                        <>
                            <ViewItems view={list} visibleItemsCount={visibleItemsCount} hideHeader />
                            {visibleItemsCount < list.view_items.length && (
                                <PaginateTextButton
                                    onClick={() => setVisibleItemsCount(visibleItemsCount + nextPageLength)}
                                >
                                    View more ({nextPageLength})
                                </PaginateTextButton>
                            )}
                        </>
                    ) : (
                        list.sources.map((source) => (
                            <AuthBanner
                                key={source.name}
                                authorizationUrl={source.authorization_url}
                                name={source.name}
                                logo={list.logo}
                                hasBorder={true}
                            />
                        ))
                    )}
                </ListContent>
            )}
        </AccordionContainer>
    )
}

export default AccordionItem