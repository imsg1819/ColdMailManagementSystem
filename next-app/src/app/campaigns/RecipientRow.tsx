"use client";

import EmailPreviewModal from "./EmailPreviewModal";

export default function RecipientRow({ person }: { person: any }) {
    return (
        <tr className="hover:bg-gray-50/50 transition-colors">
            <td className="p-4 pl-6 font-medium text-gray-900">{person.targetEmail}</td>
            <td className="p-4 text-gray-600">{person.name || "—"}</td>
            <td className="p-4 text-gray-600">{person.company || "—"}</td>
            <td className="p-4">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${person.status === 'Sent' ? 'bg-green-100 text-green-700' :
                        person.status === 'Follow-up Sent' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                    }`}>
                    {person.status}
                </span>
            </td>
            <td className="p-4 text-gray-500 text-sm">
                {person.lastSentDate ? new Date(person.lastSentDate).toLocaleDateString() : "Never"}
            </td>
            <td className="p-4 pr-6 text-center">
                <EmailPreviewModal recipientId={person.id} />
            </td>
        </tr>
    );
}
