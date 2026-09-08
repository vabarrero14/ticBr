import { useState } from 'react'
import { PersonFormModal } from '../components/PersonFormModal'
import { useCollectionData } from '../hooks/useCollectionData'
import { peopleCol } from '../lib/firestore/collections'

export function PeoplePage() {
  const { data: people, loading } = useCollectionData(peopleCol)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Personas</h1>
          <p className="text-sm text-slate-500">
            Equipo disponible para asignar tickets y responsables de casos raíz.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nueva persona
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Área</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.email}</td>
                <td className="px-4 py-3 text-slate-600">{p.area ?? '—'}</td>
              </tr>
            ))}
            {!loading && people.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Todavía no hay personas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PersonFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
