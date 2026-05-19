import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// 1. Configuration ( Mets tes identifiants Supabase ici )
const SUPABASE_URL = 'https://vdetqssagjdlvpffmorp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZXRxc3NhZ2pkbHZwZmZtb3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODQyNDUsImV4cCI6MjA5NDc2MDI0NX0.kMmilrlCcQP8qLy76ClvwfsHY774iLxJjGOfT8tQsNg'

// 2. Définis ici le CODE SECRET que les admins devront taper sur la page
const CODE_SECRET_ATTENDU = 'Gouter44390' 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const inputCode = document.getElementById('input-code-secret')
const formAddSession = document.getElementById('form-add-session')
const listeVendredis = document.getElementById('liste-vendredis')

// Charger et afficher la liste des vendredis avec le récap des inscrits
async function chargerSessionsAdmin() {
    // 1. Récupérer les sessions
    const { data: sessions, error: errorSessions } = await supabase
        .from('sessions')
        .select('*')
        .order('date_evenement', { ascending: true })

    // 2. Récupérer toutes les inscriptions
    const { data: inscriptions, error: errorInscriptions } = await supabase
        .from('inscriptions')
        .select('*')

    if (errorSessions || errorInscriptions) {
        listeVendredis.innerHTML = `<p class="text-sm text-red-500">Erreur lors du chargement des données.</p>`
        return
    }

    if (sessions.length === 0) {
        listeVendredis.innerHTML = `<p class="text-sm text-slate-400 italic">Aucun vendredi dans la base.</p>`
        return
    }

    listeVendredis.innerHTML = ''
    
    sessions.forEach(session => {
        const dateObj = new Date(session.date_evenement)
        const dateFormatee = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        const isActif = session.statut === 'actif'

        // Filtrer les inscriptions pour CE vendredi précis
        const inscritsDuJour = inscriptions.filter(i => i.session_id === session.id)
        
        // Séparer les gâteaux et les vendeurs
        const listeGateaux = inscritsDuJour.filter(i => i.role === 'gateau')
        const listeVendeurs = inscritsDuJour.filter(i => i.role === 'vente')

        // Générer le texte du récapitulatif des inscrits
        let htmlRecap = `<div class="mt-2 pt-2 border-t border-dashed border-slate-200 text-xs text-slate-600 space-y-1">`
        
        if (inscritsDuJour.length === 0) {
            htmlRecap += `<p class="text-slate-400 italic">Aucun parent inscrit pour le moment.</p>`
        } else {
            if (listeGateaux.length > 0) {
                htmlRecap += `<p><strong>🍰 Gâteaux (${listeGateaux.length}/${session.max_gateaux}) :</strong> ${listeGateaux.map(i => `${i.nom_parent} (${i.contact})`).join(', ')}</p>`
            }
            if (listeVendeurs.length > 0) {
                htmlRecap += `<p><strong>🏪 Vente (${listeVendeurs.length}/${session.max_vendeurs}) :</strong> ${listeVendeurs.map(i => `${i.nom_parent} (${i.contact})`).join(', ')}</p>`
            }
        }
        htmlRecap += `</div>`

        // Création du bloc HTML de la session
        const div = document.createElement('div')
        div.className = `p-4 border rounded-xl text-sm ${isActif ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`
        
        div.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <p class="font-semibold text-base ${isActif ? 'text-slate-900' : 'text-slate-500 line-through'}">${dateFormatee}</p>
                    <p class="text-xs ${isActif ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'} mt-0.5">
                        ${isActif ? '● Affiché aux parents' : '❌ Masqué (Vacances/Férié)'}
                    </p>
                </div>
                <button class="btn-toggle text-xs font-semibold px-3 py-1.5 rounded-lg border transition shadow-sm ${
                    isActif 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                }" data-id="${session.id}" data-statut="${session.statut}">
                    ${isActif ? 'Masquer' : 'Réactiver'}
                </button>
            </div>
            ${isActif ? htmlRecap : ''} 
        `
        // Note : On n'affiche le récapitulatif que si le vendredi est actif
        
        listeVendredis.appendChild(div)
    })

    // Événement sur les boutons Masquer / Réactiver
    document.querySelectorAll('.btn-toggle').forEach(button => {
        button.addEventListener('click', async (e) => {
            if (inputCode.value.trim() !== CODE_SECRET_ATTENDU) {
                alert("🔒 Code Secret Admin incorrect ou manquant !")
                return
            }

            const id = e.target.getAttribute('data-id')
            const statutActuel = e.target.getAttribute('data-statut')
            const nouveauStatut = statutActuel === 'actif' ? 'annule' : 'actif'

            const { error } = await supabase
                .from('sessions')
                .update({ statut: nouveauStatut })
                .eq('id', id)

            if (error) alert("Erreur de mise à jour : " + error.message)
            else chargerSessionsAdmin()
        })
    })
}

// Ajouter un vendredi
formAddSession.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (inputCode.value.trim() !== CODE_SECRET_ATTENDU) {
        alert("🔒 Code Secret Admin incorrect ou manquant !")
        return
    }

    const dateChoisie = document.getElementById('add-date').value

    const { error } = await supabase
        .from('sessions')
        .insert([{ date_evenement: dateChoisie, statut: 'actif', max_gateaux: 5, max_vendeurs: 2 }])

    if (error) {
        alert("Erreur lors de l'ajout : " + error.message)
    } else {
        alert("📅 Date ajoutée avec succès !")
        formAddSession.reset()
        chargerSessionsAdmin()
    }
})

// Démarrage
chargerSessionsAdmin()
