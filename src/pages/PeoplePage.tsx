import { useState } from 'react'
import { MergePersonModal } from '../components/MergePersonModal'
import { PersonFormModal } from '../components/PersonFormModal'
import { useCollectionData } from '../hooks/useCollectionData'
import { peopleCol, rootCausesCol, ticketsCol } from '../lib/firestore/collections'
import { deletePerson } from '../lib/firestore/people'
import type { Person } from '../lib/types'

export function PeoplePage() {
  const { data: people, loading } = useCollectionData(peopleCol)
  const { data: tickets } = useCollectionData(ticketsCol)
  const { data: rootCauses } = useCollectionData(rootCausesCol)
  const [showForm, setShowForm] = useState(false)
  const [mergingPerson, setMergingPerson] = useState<Person | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const usageOf = (personId: string) => ({
    tickets: tickets.filter((t) => t.assignees.includes(personId)).length,
    rootCauses: rootCauses.filter((rc) => rc.owner === personId).length,
  })

  async function handleDelete(person: Person) {
    if (!window.confirm(`¿Borrar a "${person.name}"? No se puede deshacer.`)) return
    setDeletingId(person.id)
    try {
      await deletePerson(person.id)
    } catch (err) {
      console.error(err)
      window.alert('No se pudo borrar. Probá de nuevo.')
    } finally {
      setDeletingId(null)
    }
  }

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
              <th className="px-4 py-2 font-medium">En uso</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((p) => {
              const usage = usageOf(p.id)
              const inUse = usage.tickets > 0 || usage.rootCauses > 0
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.area ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {inUse ? (
                      <span>
                        {usage.tickets} ticket{usage.tickets !== 1 && 's'}
                        {usage.rootCauses > 0 && `, ${usage.rootCauses} caso(s) raíz`}
                      </span>
                    ) : (
                      <span className="text-slate-400">sin uso</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setMergingPerson(p)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        Fusionar
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={inUse || deletingId === p.id}
                        title={inUse ? 'Fusionala en otra persona antes de borrarla' : undefined}
                        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        {deletingId === p.id ? 'Borrando…' : 'Borrar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && people.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
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
      {mergingPerson && (
        <MergePersonModal
          source={mergingPerson}
          people={people}
          onClose={() => setMergingPerson(null)}
        />
      )}
    </div>
  )
}
