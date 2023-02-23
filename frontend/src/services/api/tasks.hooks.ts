import { QueryFunctionContext, useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import produce, { castImmutable } from 'immer'
import { DateTime } from 'luxon'
import { DONE_FOLDER_ID, TASK_MARK_AS_DONE_TIMEOUT, TRASH_FOLDER_ID } from '../../constants'
import useOverviewContext from '../../context/OverviewContextProvider'
import useQueryContext from '../../context/QueryContext'
import { useGTLocalStorage } from '../../hooks'
import apiClient from '../../utils/api'
import navigateToNextItemAfterOverviewCompletion from '../../utils/navigateToNextItemAfterOverviewCompletion'
import {
    TExternalStatus,
    TOverviewItem,
    TOverviewView,
    TTask,
    TTaskFolder,
    TTaskSection,
    TTaskV4,
    TUserInfo,
} from '../../utils/types'
import {
    arrayMoveInPlace,
    getTaskFromSections,
    getTaskIndexFromSections,
    resetOrderingIds,
    sleep,
} from '../../utils/utils'
import { GTQueryClient, getBackgroundQueryOptions, useGTMutation, useGTQueryClient } from '../queryUtils'
import { createNewTaskV4Helper } from './tasksv4.hooks'

export interface TCreateTaskData {
    title: string
    body?: string
    taskSectionId: string
    parent_task_id?: string
    optimisticId: string
}

export interface TCreateTaskResponse {
    task_id: string
}

export interface TModifyTaskData {
    id: string
    title?: string
    dueDate?: string
    body?: string
    external_priority_id?: string
    priorityNormalized?: number
    status?: TExternalStatus
    recurringTaskTemplateId?: string
}

interface TExternalPriority {
    external_id: string
}
interface TTaskModifyRequestBody {
    task: {
        external_priority?: TExternalPriority
        priority_normalized?: number
        status?: TExternalStatus
        recurring_task_template_id?: string
    }
    id_task_section?: string
    id_ordering?: number
    title?: string
    due_date?: string
    time_duration?: number
    body?: string
}

export interface TMarkTaskDoneOrDeletedData {
    id: string
    isDone?: boolean
    isDeleted?: boolean
    waitForAnimation?: boolean
}

interface TMarkTaskDoneOrDeletedRequestBody {
    is_completed?: boolean
    is_deleted?: boolean
}

export interface TReorderTaskData {
    id: string
    isSubtask?: boolean
    parentId?: string
    dropSectionId: string
    orderingId: number
    dragSectionId?: string
    isJiraTask?: boolean
}
interface TReorderTaskRequestBody {
    id_task_section: string
    id_ordering: number
    is_completed?: boolean
    is_deleted?: boolean
}
export interface TPostCommentData {
    id: string
    body: string
    optimisticId: string
}

export const useFetchExternalTasks = () => {
    const queryClient = useGTQueryClient()
    return useQuery('tasksExternal', fetchExternalTasks, {
        onSettled: () => {
            queryClient.invalidateQueries('tasks')
            queryClient.invalidateQueries('tasks_v4')
            queryClient.invalidateQueries('overview')
        },
        ...getBackgroundQueryOptions(),
    })
}
const fetchExternalTasks = async ({ signal }: QueryFunctionContext) => {
    try {
        const res = await apiClient.get('/tasks/fetch/', { signal })
        return castImmutable(res.data)
    } catch {
        throw new Error('fetchTasks failed')
    }
}

const updateCacheForOptimsticSubtask = (queryClient: GTQueryClient, data: TCreateTaskData) => {
    const sections = queryClient.getImmutableQueryData<TTaskSection[]>('tasks')
    const views = queryClient.getImmutableQueryData<TOverviewView[]>('overview')
    const newSubtask = createNewTaskHelper(data)
    if (sections) {
        const updatedSections = produce(sections, (draft) => {
            const section = draft.find((section) => section.id === data.taskSectionId)
            if (!section) return
            const parentTask = section.tasks.find((task) => task.id === data.parent_task_id)
            if (!parentTask) return
            if (!parentTask.sub_tasks) parentTask.sub_tasks = []
            parentTask.sub_tasks = [newSubtask, ...parentTask.sub_tasks]
        })
        queryClient.setQueryData('tasks', updatedSections)
    }
    if (views) {
        const updatedViews = produce(views, (draft) => {
            const section = draft.find((view) => view.task_section_id === data.taskSectionId)
            if (!section) return
            const parentTask = section.view_items.find((task) => task.id === data.parent_task_id)
            if (!parentTask) return
            if (!parentTask.sub_tasks) parentTask.sub_tasks = []
            parentTask.sub_tasks = [newSubtask, ...parentTask.sub_tasks]
        })
        queryClient.setQueryData('overview', updatedViews)
    }
}

export const useCreateTask = () => {
    const queryClient = useGTQueryClient()
    const { setOptimisticId } = useQueryContext()
    const navigate = useNavigate()

    return useGTMutation((data: TCreateTaskData) => createTask(data), {
        tag: 'tasks',
        invalidateTagsOnSettled: ['tasks', 'tasks_v4', 'overview'],
        onMutate: async (data: TCreateTaskData) => {
            await Promise.all([
                queryClient.cancelQueries('overview-supported-views'),
                queryClient.cancelQueries('overview'),
                queryClient.cancelQueries('tasks'),
                queryClient.cancelQueries('tasks_v4'),
            ])
            if (data.parent_task_id) {
                updateCacheForOptimsticSubtask(queryClient, data)
            }
            const sections = queryClient.getImmutableQueryData<TTaskSection[]>('tasks')
            const tasks_v4 = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
            const views = queryClient.getImmutableQueryData<TOverviewView[]>('overview')

            if (sections && !data.parent_task_id) {
                const updatedSections = produce(sections, (draft) => {
                    const section = draft.find((section) => section.id === data.taskSectionId)
                    if (!section) return
                    const newTask = createNewTaskHelper(data)
                    section.tasks = [newTask, ...section.tasks]
                })
                queryClient.setQueryData('tasks', updatedSections)
            }
            if (tasks_v4) {
                const updatedTasks = produce(tasks_v4, (draft) => {
                    const newTask = createNewTaskV4Helper({
                        // map to v4, remove when v3 is removed.
                        id: data.optimisticId,
                        // We're setting id_folder instead of putting the task into a folder directly now
                        id_folder: data.taskSectionId,
                        // Need to set this if it is a subtask
                        id_parent: data.parent_task_id,
                        ...data,
                    })
                    draft.unshift(newTask)
                    // Add the id of this new task to the parent's subtask_ids
                    if (data.parent_task_id) {
                        const parentTask = draft.find((task) => task.id === data.parent_task_id)
                        if (!parentTask) return
                        parentTask.subtask_ids = [data.optimisticId, ...(parentTask.subtask_ids || [])]
                    }
                })
                queryClient.setQueryData('tasks_v4', updatedTasks)
            }
            if (views && !data.parent_task_id) {
                const updatedViews = produce(views, (draft) => {
                    const section = draft.find((view) => view.task_section_id === data.taskSectionId)
                    if (!section) return
                    const newTask = createNewTaskHelper(data) as TOverviewItem
                    section.view_items = [newTask, ...section.view_items]
                })
                queryClient.setQueryData('overview', updatedViews)
            }
        },
        onSuccess: async (response: TCreateTaskResponse, createData: TCreateTaskData) => {
            setOptimisticId(createData.optimisticId, response.task_id)

            const sections = queryClient.getImmutableQueryData<TTaskSection[]>('tasks')
            const tasks_v4 = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
            const views = queryClient.getImmutableQueryData<TOverviewView[]>('overview')

            if (sections) {
                const updatedSections = produce(sections, (draft) => {
                    const task = getTaskFromSections(
                        draft,
                        createData.parent_task_id ?? createData.optimisticId,
                        createData.taskSectionId,
                        createData.parent_task_id ? createData.optimisticId : undefined
                    )
                    if (task?.id) {
                        task.id = response.task_id
                        task.optimisticId = undefined
                    }
                })
                queryClient.setQueryData('tasks', updatedSections)
                if (
                    createData.parent_task_id &&
                    window.location.pathname.startsWith(
                        `/tasks/${createData.taskSectionId}/${createData.parent_task_id}/${createData.optimisticId}`
                    )
                ) {
                    navigate(`/tasks/${createData.taskSectionId}/${createData.parent_task_id}/${response.task_id}`)
                } else if (
                    window.location.pathname.startsWith(`/tasks/${createData.taskSectionId}/${createData.optimisticId}`)
                ) {
                    navigate(`/tasks/${createData.taskSectionId}/${response.task_id}`)
                }
            }
            if (tasks_v4) {
                const updatedTasks = produce(tasks_v4, (draft) => {
                    const task = draft.find((task) => task.id === createData.optimisticId)
                    if (task?.id) {
                        task.id = response.task_id
                        task.optimisticId = undefined
                    }
                })
                queryClient.setQueryData('tasks_v4', updatedTasks)
            }
            if (views) {
                const sectionIdx = views.findIndex((section) => section.task_section_id === createData.taskSectionId)
                if (sectionIdx !== -1) {
                    const updatedViews = produce(views, (draft) => {
                        const tempSections = draft.map((view) => ({
                            id: view.task_section_id,
                            tasks: view.view_items,
                        }))
                        const task = getTaskFromSections(
                            tempSections as unknown as TTaskSection[],
                            createData.parent_task_id ?? createData.optimisticId,
                            createData.taskSectionId,
                            createData.parent_task_id ? createData.optimisticId : undefined
                        )
                        if (task?.id) {
                            task.id = response.task_id
                            task.optimisticId = undefined
                        }
                    })
                    queryClient.setQueryData('overview', updatedViews)
                    if (
                        createData.parent_task_id &&
                        window.location.pathname.startsWith(
                            `/overview/${views[sectionIdx].id}/${createData.parent_task_id}/${createData.optimisticId}`
                        )
                    ) {
                        navigate(`/overview/${views[sectionIdx].id}/${createData.parent_task_id}/${response.task_id}`)
                    } else if (
                        window.location.pathname.startsWith(
                            `/overview/${views[sectionIdx].id}/${createData.optimisticId}`
                        )
                    ) {
                        navigate(`/overview/${views[sectionIdx].id}/${response.task_id}`)
                    }
                }
            }
        },
    })
}
export const createTask = async (data: TCreateTaskData) => {
    try {
        const res = await apiClient.post('/tasks/create/gt_task/', {
            title: data.title,
            body: data.body ?? '',
            id_task_section: data.taskSectionId,
            parent_task_id: data.parent_task_id,
        })
        return castImmutable(res.data)
    } catch {
        throw new Error('createTask failed')
    }
}

export const useModifyTask = () => {
    const queryClient = useGTQueryClient()
    return useGTMutation((data: TModifyTaskData) => modifyTask(data), {
        tag: 'tasks_v4',
        invalidateTagsOnSettled: ['tasks_v4', 'overview'],
        onMutate: async (data: TModifyTaskData) => {
            await Promise.all([queryClient.cancelQueries('overview'), queryClient.cancelQueries('tasks_v4')])

            const tasks = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
            if (tasks) {
                const updatedTasks = produce(tasks, (draft) => {
                    const task = draft.find((task) => task.id === data.id)
                    if (!task) return
                    task.title = data.title || task.title
                    if (data.dueDate === '1969-12-31') {
                        task.due_date = ''
                    } else {
                        task.due_date = data.dueDate ?? task.due_date
                    }
                    task.body = data.body ?? task.body
                    task.priority_normalized = data.priorityNormalized ?? task.priority_normalized
                    task.external_status = data.status ?? task.external_status
                    task.recurring_task_template_id = data.recurringTaskTemplateId ?? task.recurring_task_template_id
                    if (data.external_priority_id) {
                        const newPriority = task.all_priorities?.find(
                            (priority) => priority.external_id === data.external_priority_id
                        )
                        if (newPriority) task.priority = newPriority
                    }
                    task.updated_at = DateTime.utc().toISO()
                })
                queryClient.setQueryData('tasks_v4', updatedTasks)
            }
        },
    })
}
const modifyTask = async (data: TModifyTaskData) => {
    // Format due date to ISO string in format yyyy-MM-dd
    if (data.dueDate) {
        data.dueDate = DateTime.fromISO(data.dueDate).toFormat('yyyy-MM-dd')
    }
    const requestBody: TTaskModifyRequestBody = { task: {} }
    if (data.title !== undefined) requestBody.title = data.title
    if (data.dueDate !== undefined) requestBody.due_date = data.dueDate
    if (data.body !== undefined) requestBody.body = data.body
    if (data.external_priority_id !== undefined) {
        if (!requestBody.task.external_priority)
            requestBody.task.external_priority = {
                external_id: data.external_priority_id,
            }
    }
    if (data.priorityNormalized !== undefined) requestBody.task.priority_normalized = data.priorityNormalized
    if (data.status !== undefined) requestBody.task.status = data.status
    if (data.recurringTaskTemplateId !== undefined)
        requestBody.task.recurring_task_template_id = data.recurringTaskTemplateId
    try {
        const res = await apiClient.patch(`/tasks/modify/${data.id}/`, requestBody)
        return castImmutable(res.data)
    } catch {
        throw new Error('modifyTask failed')
    }
}

export const useMarkTaskDoneOrDeleted = () => {
    const queryClient = useGTQueryClient()
    const [overviewAutomaticEmptySort] = useGTLocalStorage('overviewAutomaticEmptySort', false, true)
    const navigate = useNavigate()
    const { setOpenListIds } = useOverviewContext()

    return useGTMutation((data: TMarkTaskDoneOrDeletedData) => markTaskDoneOrDeleted(data), {
        tag: 'tasks',
        invalidateTagsOnSettled: ['tasks_v4', 'folders', 'overview'],
        onMutate: async (data: TMarkTaskDoneOrDeletedData) => {
            await Promise.all([
                queryClient.cancelQueries('tasks_v4'),
                queryClient.cancelQueries('folders'),
                queryClient.cancelQueries('overview'),
            ])
            const tasks = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
            const updateTasks = async () => {
                if (!tasks) return
                const updatedTasks = produce(tasks, (draft) => {
                    const task = draft.find((task) => task.id === data.id)
                    if (!task) return
                    if (data.isDone !== undefined) task.is_done = data.isDone
                    if (data.isDeleted !== undefined) task.is_deleted = data.isDeleted
                })
                if (data.waitForAnimation) {
                    await sleep(TASK_MARK_AS_DONE_TIMEOUT)
                }
                queryClient.setQueryData('tasks_v4', updatedTasks)
            }

            const folders = queryClient.getImmutableQueryData<TTaskFolder[]>('folders')
            const updateFolders = async () => {
                if (!folders) return
                const updatedFolders = produce(folders, (draft) => {
                    const currentFolder = draft.find((folder) => folder.task_ids.includes(data.id))
                    const doneFolder = draft.find((folder) => folder.id === DONE_FOLDER_ID)
                    const trashFolder = draft.find((folder) => folder.id === TRASH_FOLDER_ID)
                    if (!currentFolder || !doneFolder || !trashFolder) return
                    if (data.isDone !== undefined) {
                        if (data.isDone && !currentFolder.is_done) {
                            currentFolder.task_ids = currentFolder.task_ids.filter((id) => id !== data.id)
                            doneFolder.task_ids.unshift(data.id)
                        } else if (!data.isDone && currentFolder.is_done) {
                            doneFolder.task_ids = doneFolder.task_ids.filter((id) => id !== data.id)
                            currentFolder.task_ids.unshift(data.id)
                        }
                    }
                    if (data.isDeleted !== undefined) {
                        if (data.isDeleted && !currentFolder.is_trash) {
                            currentFolder.task_ids = currentFolder.task_ids.filter((id) => id !== data.id)
                            trashFolder.task_ids.unshift(data.id)
                        } else if (!data.isDeleted && currentFolder.is_trash) {
                            trashFolder.task_ids = trashFolder.task_ids.filter((id) => id !== data.id)
                            currentFolder.task_ids.unshift(data.id)
                        }
                    }
                })
                if (data.waitForAnimation) {
                    await sleep(TASK_MARK_AS_DONE_TIMEOUT)
                }
                queryClient.setQueryData('tasks', updatedFolders)
            }

            const lists = queryClient.getImmutableQueryData<TOverviewView[]>('overview')
            const updateLists = async () => {
                if (!lists) return
                const updatedLists = produce(lists, (draft) => {
                    const currentLists = draft.filter((list) => list.view_item_ids.includes(data.id))
                    if (!currentLists) return
                    if (data.isDone || data.isDeleted) {
                        for (const list of currentLists) {
                            list.view_item_ids = list.view_item_ids.filter((id) => id !== data.id)
                            if (list.view_item_ids.length === 0) {
                                list.has_tasks_completed_today = true
                            }
                        }
                    }
                    if (overviewAutomaticEmptySort) {
                        draft.sort((a, b) => {
                            if (a.view_items.length === 0 && b.view_items.length > 0) return 1
                            if (a.view_items.length > 0 && b.view_items.length === 0) return -1
                            return 0
                        })
                    }
                })
                if (data.waitForAnimation) {
                    await sleep(TASK_MARK_AS_DONE_TIMEOUT)
                }

                queryClient.setQueryData('overview', updatedLists)

                if (window.location.pathname.split('/')[1] !== 'overview') return
                if (!lists.some((list) => list.view_item_ids.includes(data.id))) return
                navigateToNextItemAfterOverviewCompletion(
                    lists as TOverviewView[],
                    updatedLists as TOverviewView[],
                    data.id,
                    navigate,
                    setOpenListIds
                )
            }
            // execute in parallel if waiting for animation delay
            updateFolders()
            updateTasks()
            updateLists()
        },
    })
}
export const markTaskDoneOrDeleted = async (data: TMarkTaskDoneOrDeletedData) => {
    const requestBody: TMarkTaskDoneOrDeletedRequestBody = {}
    if (data.isDone !== undefined) requestBody.is_completed = data.isDone
    if (data.isDeleted !== undefined) requestBody.is_deleted = data.isDeleted
    try {
        const res = await apiClient.patch(`/tasks/modify/${data.id}/`, requestBody)
        return castImmutable(res.data)
    } catch {
        throw new Error('markTaskDoneOrDeleted failed')
    }
}

const reorderSubtasks = (data: TReorderTaskData, queryClient: GTQueryClient) => {
    const sections = queryClient.getImmutableQueryData<TTaskSection[]>('tasks')
    const views = queryClient.getImmutableQueryData<TOverviewView[]>('overview')
    if (sections) {
        const newSections = produce(sections, (draft) => {
            const section = draft.find((s) => s.id === data.dropSectionId)
            if (!section) return
            const task = section?.tasks.find((t) => t.id === data.parentId)
            if (!task) return
            const subtasks = task.sub_tasks
            if (!subtasks) return

            const startIndex = subtasks.findIndex((s) => s.id === data.id)
            if (startIndex === -1) return
            let endIndex = data.orderingId - 1
            if (startIndex < endIndex) endIndex -= 1
            arrayMoveInPlace(subtasks, startIndex, endIndex)
            resetOrderingIds(subtasks)
        })
        queryClient.setQueryData('tasks', newSections)
    }
    if (views) {
        const newViews = produce(views, (draft) => {
            const view = draft.find((v) => v.task_section_id === data.dropSectionId)
            if (!view) return
            const task = view.view_items.find((t) => t.id === data.parentId)
            if (!task) return
            const subtasks = task.sub_tasks
            if (!subtasks) return

            const startIndex = subtasks.findIndex((s) => s.id === data.id)
            if (startIndex === -1) return
            let endIndex = data.orderingId - 1
            if (startIndex < endIndex) endIndex -= 1
            arrayMoveInPlace(subtasks, startIndex, endIndex)
            resetOrderingIds(subtasks)
        })
        queryClient.setQueryData('overview', newViews)
    }

    const tasks_v4 = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
    if (tasks_v4) {
        const updatedTasks = produce(tasks_v4, (draft) => {
            const subtask = draft.find((task) => task.id === data.id)
            if (!subtask) return
            subtask.id_ordering = data.orderingId
            const parentSubtasks = draft
                .filter((task) => task.id_parent === data.parentId)
                .sort((a, b) => a.id_ordering - b.id_ordering)
            resetOrderingIds(parentSubtasks)
        })
        queryClient.setQueryData('tasks', updatedTasks)
    }
}

export const useReorderTask = () => {
    const queryClient = useGTQueryClient()
    return useGTMutation((data: TReorderTaskData) => reorderTask(data), {
        tag: 'tasks',
        invalidateTagsOnSettled: ['tasks', 'tasks_v4', 'overview'],
        onMutate: async (data: TReorderTaskData) => {
            await Promise.all([
                queryClient.cancelQueries('overview-supported-views'),
                queryClient.cancelQueries('overview'),
                queryClient.cancelQueries('tasks'),
                queryClient.cancelQueries('tasks_v4'),
            ])
            if (data.isSubtask) {
                reorderSubtasks(data, queryClient)
                return
            }
            const sections = queryClient.getImmutableQueryData<TTaskSection[]>('tasks')
            const tasks_v4 = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
            const views = queryClient.getImmutableQueryData<TOverviewView[]>('overview')
            if (sections) {
                const newSections = produce(sections, (draft) => {
                    // move within the existing section
                    if (!data.dragSectionId || data.dragSectionId === data.dropSectionId) {
                        const section = draft.find((s) => s.id === data.dropSectionId)
                        if (section == null) return
                        const startIndex = section.tasks.findIndex((t) => t.id === data.id)
                        if (startIndex === -1) return
                        let endIndex = data.orderingId - 1
                        if (startIndex < endIndex) {
                            endIndex -= 1
                        }
                        arrayMoveInPlace(section.tasks, startIndex, endIndex)

                        // update ordering ids
                        resetOrderingIds(section.tasks)
                    }
                    // move task from one section to the other
                    else {
                        // remove task from old location
                        const dragSection = draft.find((section) => section.id === data.dragSectionId)
                        if (dragSection == null) return
                        const dragTaskIndex = dragSection.tasks.findIndex((task) => task.id === data.id)
                        if (dragTaskIndex === -1) return
                        const dragTask = dragSection.tasks[dragTaskIndex]
                        dragSection.tasks.splice(dragTaskIndex, 1)

                        // change done/trash status if needed
                        dragTask.is_done = data.dropSectionId === DONE_FOLDER_ID
                        dragTask.is_deleted = data.dropSectionId === TRASH_FOLDER_ID

                        // add task to new location
                        const dropSection = draft.find((section) => section.id === data.dropSectionId)
                        if (dropSection == null) return
                        dropSection.tasks.splice(data.orderingId - 1, 0, dragTask)

                        // update ordering ids
                        resetOrderingIds(dropSection.tasks)
                        resetOrderingIds(dragSection.tasks)
                    }
                })
                queryClient.setQueryData('tasks', newSections)
            }
            if (tasks_v4) {
                const updatedTasks = produce(tasks_v4, (draft) => {
                    const task = draft.find((task) => task.id === data.id)
                    if (!task) return
                    task.id_ordering = data.orderingId
                    task.id_folder = data.dropSectionId
                    task.is_done = data.dropSectionId === DONE_FOLDER_ID
                    task.is_deleted = data.dropSectionId === TRASH_FOLDER_ID
                    const dropFolder = draft
                        .filter((task) => task.id_folder === data.dropSectionId && !task.id_parent)
                        .sort((a, b) => a.id_ordering - b.id_ordering)
                    resetOrderingIds(dropFolder)
                })
                queryClient.setQueryData('tasks_v4', updatedTasks)
            }
            if (views) {
                const newViews = produce(views, (draft) => {
                    // move within the existing section
                    if (!data.dragSectionId || data.dragSectionId === data.dropSectionId) {
                        const section = draft.find((view) => view.task_section_id === data.dropSectionId)
                        if (section == null) return
                        const startIndex = section.view_items.findIndex((t) => t.id === data.id)
                        if (startIndex === -1) return
                        let endIndex = data.orderingId - 1
                        if (startIndex < endIndex) {
                            endIndex -= 1
                        }
                        arrayMoveInPlace(section.view_items, startIndex, endIndex)

                        // update ordering ids
                        resetOrderingIds(section.view_items)
                    }
                    // move task from one section to the other
                    else {
                        // remove task from old location
                        const dragSection = draft.find((section) => section.task_section_id === data.dragSectionId)
                        if (dragSection == null) return
                        const dragTaskIndex = dragSection.view_items.findIndex((item) => item.id === data.id)
                        if (dragTaskIndex === -1) return
                        const dragTask = dragSection.view_items[dragTaskIndex]
                        dragSection.view_items.splice(dragTaskIndex, 1)

                        // add task to new location
                        const dropSection = draft.find((section) => section.task_section_id === data.dropSectionId)
                        if (dropSection == null) return
                        dropSection.view_items.splice(data.orderingId - 1, 0, dragTask)

                        // update ordering ids
                        resetOrderingIds(dropSection.view_items)
                        resetOrderingIds(dragSection.view_items)
                    }
                })
                queryClient.setQueryData('overview', newViews)
            }
        },
    })
}

export const reorderTask = async (data: TReorderTaskData) => {
    try {
        const requestBody: TReorderTaskRequestBody = {
            id_task_section: data.dropSectionId,
            id_ordering: data.orderingId,
            is_completed: data.isSubtask ? undefined : data.dropSectionId === DONE_FOLDER_ID,
        }
        if (data.isJiraTask) {
            requestBody.is_deleted = data.dropSectionId === TRASH_FOLDER_ID
        }
        const res = await apiClient.patch(`/tasks/modify/${data.id}/`, requestBody)
        return castImmutable(res.data)
    } catch {
        throw new Error('reorderTask failed')
    }
}

export const usePostComment = () => {
    const queryClient = useGTQueryClient()
    return useGTMutation((data: TPostCommentData) => postComment(data), {
        tag: 'tasks',
        invalidateTagsOnSettled: ['tasks', 'tasks_v4', 'overview'],
        onMutate: async (data: TPostCommentData) => {
            const userInfo = queryClient.getImmutableQueryData<TUserInfo>('user_info')
            const sections = queryClient.getImmutableQueryData<TTaskSection[]>('tasks')
            const tasks_v4 = queryClient.getImmutableQueryData<TTaskV4[]>('tasks_v4')
            const views = queryClient.getImmutableQueryData<TOverviewView[]>('overview')
            await Promise.all([
                queryClient.cancelQueries('tasks'),
                queryClient.cancelQueries('tasks_v4'),
                queryClient.cancelQueries('overview'),
            ])
            if (sections) {
                const newSections = produce(sections, (draft) => {
                    const task = getTaskFromSections(draft, data.id)
                    if (task) {
                        task.comments?.unshift({
                            body: data.body,
                            created_at: DateTime.local().toISO(),
                            user: {
                                DisplayName: userInfo?.linear_display_name ?? 'You',
                                Email: '',
                                ExternalID: data.optimisticId,
                                Name: userInfo?.linear_name ?? 'You',
                            },
                        })
                    }
                })

                queryClient.setQueryData('tasks', newSections)
            }
            if (tasks_v4) {
                const updatedTasks = produce(tasks_v4, (draft) => {
                    const task = draft.find((task) => task.id === data.id)
                    if (!task) return
                    task.comments?.unshift({
                        body: data.body,
                        created_at: DateTime.local().toISO(),
                        user: {
                            DisplayName: userInfo?.linear_display_name ?? 'You',
                            Email: '',
                            ExternalID: data.optimisticId,
                            Name: userInfo?.linear_name ?? 'You',
                        },
                    })
                })

                queryClient.setQueryData('tasks_v4', updatedTasks)
            }
            if (views) {
                const newViews = produce(views, (draft) => {
                    const sections = views.map((view) => ({
                        id: view.task_section_id,
                        tasks: view.view_items,
                    }))
                    const { taskIndex, sectionIndex } = getTaskIndexFromSections(sections, data.id)
                    if (sectionIndex !== undefined && taskIndex !== undefined) {
                        const task = draft[sectionIndex].view_items[taskIndex]
                        task.comments?.unshift({
                            body: data.body,
                            created_at: DateTime.local().toISO(),
                            user: {
                                DisplayName: userInfo?.linear_display_name ?? 'You',
                                Email: '',
                                ExternalID: data.optimisticId,
                                Name: userInfo?.linear_name ?? 'You',
                            },
                        })
                    }
                })

                queryClient.setQueryData('overview', newViews)
            }
        },
    })
}
const postComment = async (data: TPostCommentData) => {
    try {
        const res = await apiClient.post(`/tasks/${data.id}/comments/add/`, data)
        return castImmutable(res.data)
    } catch {
        throw new Error('postComment failed')
    }
}

export const createNewTaskHelper = (data: Partial<TTask> & { optimisticId: string; title: string }): TTask => {
    return {
        id: data.optimisticId,
        optimisticId: data.optimisticId,
        id_ordering: data.id_ordering ?? 0.5,
        title: data.title,
        body: data.body ?? '',
        deeplink: data.deeplink ?? '',
        sent_at: data.sent_at ?? '',
        priority_normalized: data.priority_normalized ?? 0,
        time_allocated: data.time_allocated ?? 0,
        due_date: data.due_date ?? '',
        source: data.source ?? {
            name: 'General Task',
            logo: '',
            logo_v2: 'generaltask',
            is_completable: false,
            is_replyable: false,
        },
        sender: data.sender ?? '',
        is_done: data.is_done ?? false,
        is_deleted: data.is_deleted ?? false,
        is_meeting_preparation_task: data.is_meeting_preparation_task ?? false,
        nux_number_id: data.nux_number_id ?? 0,
        created_at: data.created_at ?? '',
        updated_at: data.updated_at ?? '',
    }
}
