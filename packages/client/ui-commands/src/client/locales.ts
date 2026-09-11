/** `command` namespace dictionaries (the popupSelect shell's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'description.compact': '压缩以上对话内容',
  'description.export': '将当前会话内容导出为 ZIP',
  'description.feedback': '发送关于当前会话的反馈',
  'description.goal': '设置或查看长期任务目标',
  'description.permission': '切换权限预设（沙箱模式与审批策略）',
  'description.plan': '进入或退出计划模式',
  'search.placeholder': '搜索…',
  'search.aria': '筛选选项',
  'status.loading': '正在加载选项…',
  'status.applying': '正在应用…',
  'status.empty': '无选项',
  'overlay.aria': '/{command} 选项',
  'listbox.aria': '/{command} 匹配项',
  'notice.attachmentsUnsupported': '/{command} 不接受附件，请先移除附件',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'description.compact': 'Compact older conversation history',
  'description.export': 'Download this Session log as a ZIP archive',
  'description.feedback': 'record feedback about this session',
  'description.goal': 'set or view the goal for a long-running task',
  'description.permission': 'Switch the permission preset (sandbox mode + approval policy)',
  'description.plan': 'Enter or leave plan mode',
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'notice.attachmentsUnsupported': '/{command} does not accept attachments; remove them first',
} satisfies Record<CommandKey, string>

/** Vietnamese dictionary. */
export const vi = {
  'description.compact': 'Nén lịch sử hội thoại cũ',
  'description.export': 'Tải nhật ký phiên này dưới dạng ZIP',
  'description.feedback': 'ghi phản hồi về phiên này',
  'description.goal': 'đặt hoặc xem mục tiêu cho tác vụ chạy dài',
  'description.permission': 'Đổi preset quyền (sandbox + chính sách phê duyệt)',
  'description.plan': 'Vào hoặc thoát chế độ kế hoạch',
  'search.placeholder': 'Tìm kiếm…',
  'search.aria': 'Lọc lựa chọn',
  'status.loading': 'Đang tải lựa chọn…',
  'status.applying': 'Đang áp dụng…',
  'status.empty': 'Không có lựa chọn',
  'overlay.aria': 'Tùy chọn /{command}',
  'listbox.aria': 'Kết quả /{command}',
  'notice.attachmentsUnsupported': '/{command} không nhận tệp đính kèm; hãy gỡ chúng trước',
}

