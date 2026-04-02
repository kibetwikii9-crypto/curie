import { LabelHTMLAttributes } from 'react'

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-sm font-medium text-gray-700 ${props.className ?? ''}`} {...props} />
}
