export  const STATUS_CONFIG = {
  pending_approval: { label: "Pending Review",  bg: "bg-blue-50",   text: "text-blue-700",  border: "border-blue-200"  },
  active:           { label: "Active",           bg: "bg-green-50",  text: "text-green-700", border: "border-green-200" },
  rejected:         { label: "Rejected",         bg: "bg-red-50",    text: "text-red-700",   border: "border-red-200"   },
  draft:            { label: "Draft",            bg: "bg-gray-50",   text: "text-gray-600",  border: "border-gray-200"  },
  inactive:         { label: "Inactive",         bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-200" },
} as const;

