/** `settings.permission` namespace dictionaries (the Permission row's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '权限',
  'description': '选择新会话的默认权限模式',
  'loading': '加载中',
  'unavailable': '不可用',
  'preset.readOnly': '仅可查看',
  'preset.workspaceWrite': '工作区内修改',
  'preset.fullAccess': '完全权限',
  'confirm.title': '确认启用完全权限？',
  'confirm.description': '启用完全权限后，新会话将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任后续任务时使用。',
  'confirm.acknowledge': '我已了解风险，并愿意继续',
  'confirm.cancel': '取消',
  'confirm.enable': '启用完全权限',
} satisfies Record<string, string>

/** The settings.permission namespace key union. */
export type PermissionSettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'title': 'Permission',
  'description': 'Choose the default permission mode for new sessions',
  'loading': 'Loading',
  'unavailable': 'Unavailable',
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access lets new sessions reduce confirmation steps and perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust subsequent tasks.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
} satisfies Record<PermissionSettingsKey, string>

/** Vietnamese dictionary. */
export const vi = {
  'title': 'Quyền',
  'description': 'Chọn chế độ quyền mặc định cho phiên mới',
  'loading': 'Đang tải',
  'unavailable': 'Không khả dụng',
  'preset.readOnly': 'Chỉ xem',
  'preset.workspaceWrite': 'Ghi trong workspace',
  'preset.fullAccess': 'Toàn quyền',
  'confirm.title': 'Bật toàn quyền?',
  'confirm.description': 'Toàn quyền giúp phiên mới giảm bước xác nhận và thực hiện nhiều thao tác trực tiếp hơn, gồm thao tác nhạy cảm, thay đổi tệp hoặc lệnh bên ngoài. Chỉ dùng khi bạn tin các tác vụ sau đó.',
  'confirm.acknowledge': 'Tôi hiểu rủi ro và muốn tiếp tục',
  'confirm.cancel': 'Hủy',
  'confirm.enable': 'Bật toàn quyền',
}


/** Simplified Chinese dictionary for the current-session popup gate. */
export const accessZh = {
  'preset.readOnly': '仅可查看',
  'preset.workspaceWrite': '工作区内修改',
  'preset.fullAccess': '完全权限',
  'confirm.title': '确认启用完全权限？',
  'confirm.description': '启用完全权限后，智能体将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。',
  'confirm.acknowledge': '我已了解风险，并愿意继续',
  'confirm.cancel': '取消',
  'confirm.enable': '启用完全权限',
} satisfies Record<string, string>

/** Current-session popup-gate key union. */
export type PermissionAccessKey = keyof typeof accessZh

/** English dictionary for the current-session popup gate. */
export const accessEn = {
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
} satisfies Record<PermissionAccessKey, string>

/** Vietnamese dictionary for the current-session popup gate. */
export const accessVi = {
  'preset.readOnly': 'Chỉ xem',
  'preset.workspaceWrite': 'Ghi trong workspace',
  'preset.fullAccess': 'Toàn quyền',
  'confirm.title': 'Bật toàn quyền?',
  'confirm.description': 'Toàn quyền giảm bước xác nhận và cho phép tác nhân thực hiện nhiều thao tác trực tiếp hơn, gồm thao tác nhạy cảm, thay đổi tệp hoặc lệnh bên ngoài. Chỉ dùng khi bạn tin tác vụ hiện tại.',
  'confirm.acknowledge': 'Tôi hiểu rủi ro và muốn tiếp tục',
  'confirm.cancel': 'Hủy',
  'confirm.enable': 'Bật toàn quyền',
} satisfies Record<PermissionAccessKey, string>
