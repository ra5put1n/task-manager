import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetTasks, useMarkTaskDone, useReorderTask } from '../../services/api/tasks.hooks'

import styled from 'styled-components'
import useItemSelectionController from '../../hooks/useItemSelectionController'
import { Colors } from '../../styles'
import { DEFAULT_VIEW_WIDTH } from '../../styles/dimensions'
import { DropItem, DropType, TTaskSection } from '../../utils/types'
import ReorderDropContainer from '../atoms/ReorderDropContainer'
import Task from '../molecules/Task'

const BannerAndSectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    border-right: 1px solid ${Colors.background.dark};
    margin-right: auto;
    flex-shrink: 0;
    position: relative;
`
const ScrollViewMimic = styled.div`
    margin: 40px 0px 0px 10px;
    padding-right: 10px;
    overflow-y: auto;
    flex: 1;
    width: ${DEFAULT_VIEW_WIDTH};
`
const TaskSectionViewContainer = styled.div`
    flex: 1;
    display: flex;
    height: 100%;
    flex-direction: column;
    padding-top: 0;
    background-color: ${Colors.background.light};
`
const TasksContainer = styled.div`
    display: flex;
    flex-direction: column;
`
const BottomDropArea = styled.div`
    height: 100px;
`

interface TaskListProps {
    section: TTaskSection
}

const TaskList = ({ section }: TaskListProps) => {
    const sectionScrollingRef = useRef<HTMLDivElement | null>(null)
    // const bannerTaskSectionRef = useRef<HTMLDivElement | null>(null)
    const sectionViewRef = useRef<HTMLDivElement>(null)

    const {
        data: taskSections,
        // isLoading: isLoadingTasks,
        // isFetching: isFetchingTasks,
        // refetch: getTasks,
    } = useGetTasks()
    const { mutate: reorderTask } = useReorderTask()
    const { mutate: markTaskDone } = useMarkTaskDone()
    // const { refetch: fetchExternal, isFetching: isFetchingExternal } = useFetchExternalTasks()

    const navigate = useNavigate()
    const params = useParams()

    // const refresh = () => {
    //     getTasks()
    //     fetchExternal()
    // }

    const { task } = useMemo(() => {
        // const section = taskSections?.find(({ id }) => id === params.section)
        const task = section?.tasks.find(({ id }) => id === params.task)
        return { section, task }
    }, [taskSections, params.task, params.section])

    const selectTask = useCallback(
        (itemId: string) => {
            if (section) navigate(`/tasks/${section.id}/${itemId}`)
        },
        [section]
    )

    const handleReorderTask = useCallback(
        (item: DropItem, dropIndex: number) => {
            if (!section) return
            reorderTask({
                taskId: item.id,
                orderingId: dropIndex,
                dropSectionId: section.id,
            })
        },
        [section]
    )

    const handleMarkTaskComplete = useCallback(
        (taskId: string, isComplete: boolean) => {
            if (!section) return
            markTaskDone({ taskId, sectionId: section.id, isCompleted: isComplete })
        },
        [section, markTaskDone]
    )

    // deal with invalid routes
    useEffect(() => {
        if (taskSections && taskSections.length > 0 && (!section || !task)) {
            const firstSectionId = taskSections[0].id
            if (!section) {
                navigate(`/tasks/${firstSectionId}/`)
            } else if (!task && section.tasks.length > 0) {
                navigate(`/tasks/${section.id}/${section.tasks[0].id}`)
            }
        }
    }, [taskSections, params.section, params.task])

    useItemSelectionController(section?.tasks ?? [], selectTask)

    return (
        <>
            <TasksContainer ref={sectionViewRef} data-testid="task-list-container">
                {section.tasks.map((task, index) => (
                    <ReorderDropContainer
                        key={task.id}
                        index={index}
                        acceptDropType={DropType.TASK}
                        onReorder={handleReorderTask}
                    >
                        <Task
                            task={task}
                            dragDisabled={section.is_done}
                            index={index}
                            sectionId={section.id}
                            sectionScrollingRef={sectionScrollingRef}
                            isSelected={task.id === params.task}
                            link={`/tasks/${params.section}/${task.id}`}
                            onMarkComplete={handleMarkTaskComplete}
                        />
                    </ReorderDropContainer>
                ))}
            </TasksContainer>
        </>
    )
}

export default TaskList