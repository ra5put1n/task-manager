import { BugReport, GitHub } from '@mui/icons-material'

export const logos = Object.freeze({
    generaltask_single_color: 'images/gt-logo-single-color.svg',
    generaltask_black_on_white: 'images/gt-logo-black-on-white.svg',
    generaltask: '/images/generaltask.svg',
    generaltask_beta_yellow: '/images/GT-beta-logo.png',
    generaltask_beta_blue: '/images/GT-beta-logo-blue.png',
    generaltask_yellow_circle: '/images/gt-logo-yellow-circle.png',
    generaltask_blue_circle: '/images/gt-logo-blue-circle.png',
    github: GitHub,
    gmail: '/images/google.svg',
    gcal: '/images/gcal.png',
    google_meet: '/images/google-meet.svg',
    jira: '/images/jira.svg',
    linear: '/images/linear.png',
    slack: '/images/slack.svg',
})

export const icons = Object.freeze({
    arrow_ascend: BugReport,
    arrow_descend: BugReport,
    arrow_down: BugReport,
    arrow_left: BugReport,
    arrow_right: BugReport,
    arrow_up: BugReport,
    arrow_up_down: BugReport,
    arrows_in: BugReport,
    arrows_out: BugReport,
    arrows_repeat: BugReport,
    bold: BugReport,
    bolt: BugReport,
    calendar_blank: BugReport,
    calendar_days: BugReport,
    calendar_pen: BugReport,
    calendar_star: BugReport,
    caret_down_solid: BugReport,
    caret_down: BugReport,
    caret_left: BugReport,
    caret_right: BugReport,
    caret_up: BugReport,
    chartLineUp: BugReport,
    check_circle_wavy: BugReport,
    check: BugReport,
    checkbox_checked_solid: BugReport,
    checkbox_checked: BugReport,
    checkbox_unchecked: BugReport,
    checkCircleSolid: BugReport,
    clock: BugReport,
    clone: BugReport,
    code_block: BugReport,
    code: BugReport,
    comment: BugReport,
    copy: BugReport,
    domino: BugReport,
    dot: BugReport,
    emptySet: BugReport,
    ellipsisVertical: BugReport,
    exclamationTriangleSolid: BugReport,
    external_link: BugReport,
    eye: BugReport,
    eye_slash: BugReport,
    filter: BugReport,
    fire: BugReport,
    flask: BugReport,
    folder: BugReport,
    gcal: logos.gcal,
    gear: BugReport,
    github_high: '/images/github_high.svg',
    github_low: '/images/github_low.svg',
    github_med: '/images/github_med.svg',
    github_paused: '/images/github_paused.svg',
    github: logos.github,
    globe: BugReport,
    hamburger: BugReport,
    headphones: BugReport,
    houseDay: BugReport,
    inbox: BugReport,
    infinity: BugReport,
    infoCircleSolid: BugReport,
    italic: BugReport,
    jira: logos.jira,
    label: BugReport,
    linear: logos.linear,
    linear_cycle_all: '/images/linear_cycle_all.svg',
    linear_cycle_current: '/images/linear_cycle_current.svg',
    linear_cycle_next: '/images/linear_cycle_next.svg',
    linear_cycle_none: '/images/linear_backlog.svg',
    linear_cycle_previous: '/images/linear_cycle_previous.svg',
    link: BugReport,
    link_slashed: BugReport,
    list_ol: BugReport,
    list_ul: BugReport,
    list: BugReport,
    magnifying_glass: BugReport,
    megaphone: BugReport,
    note: BugReport,
    penToSquare: BugReport,
    pencil: BugReport,
    play: BugReport,
    plus: BugReport,
    priority_high: BugReport,
    priority_low: BugReport,
    priority_medium: BugReport,
    priority_none: BugReport,
    priority_urgent: BugReport,
    priority: BugReport,
    quote_right: BugReport,
    rankingStar: BugReport,
    repository: BugReport,
    save: BugReport,
    share: BugReport,
    sidebar: BugReport,
    sidebarFlipped: BugReport,
    slack: logos.slack,
    sort: BugReport,
    sortArrows: BugReport,
    spinner: BugReport,
    strikethrough: BugReport,
    square: BugReport,
    squarePlus: BugReport,
    squareMinus: BugReport,
    subtask: BugReport,
    timer: BugReport,
    trash: BugReport,
    underline: BugReport,
    user: BugReport,
    users: BugReport,
    video: BugReport,
    warning: BugReport,
    warningTriangle: BugReport,
    x: BugReport,
})

export const buttons: { [key: string]: string } = {
    google_sign_in: '/images/google_sign_in.png', //missing svg
}

export const externalStatusIcons = Object.freeze({
    // Linear
    backlog: '/images/linear_backlog.svg',
    unstarted: '/images/linear_todo.svg',
    started: '/images/linear_inprogress.svg',
    completed: '/images/linear_done.svg',
    canceled: '/images/linear_canceled.svg',

    inreview: '/images/linear_inreview.svg',
    triage: '/images/linear_triage.svg',
    duplicate: '/images/linear_duplicate.svg',

    // Jira
    new: '/images/jira/new.svg',
    indeterminate: '/images/jira/indeterminate.svg',
    done: '/images/jira/done.svg',
})

export const focusModeBackground = '/images/focus_mode_background.jpg'
export const noteBackground = '/images/note_background.jpg'
export const checkBig = '/images/check_big.svg'

export type TLogoImage = keyof typeof logos
export type TIconImage = keyof typeof icons
export type TExternalStatusImage = keyof typeof externalStatusIcons
