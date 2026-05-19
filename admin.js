import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// 1. Configuration ( Mets tes identifiants Supabase ici )
const SUPABASE_URL = 'https://vdetqssagjdlvpffmorp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZXRxc3NhZ2pkbHZwZmZtb3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODQyNDUsImV4cCI6MjA5NDc2MDI0NX0.kMmilrlCcQP8qLy76ClvwfsHY774iLxJjGOfT8tQsNg'

// 2. Définis ici le CODE SECRET que les admins devront taper sur la page
const CODE_SECRET_ATTENDU = 'TON_CODE_SECRET_ICI' 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const inputCode = document.getElementById('input-code-secret')
const formAddSession = document.getElementById('form-add-session')
const listeVendredis = document.getElementById('liste-vendredis')

// Charger et afficher la liste des vendredis
async function chargerSessionsAdmin() {
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date_evenement', { ascending: true })

    if (error) {
        listeVendredis.innerHTML = `<p class="text-sm text-red-500">Erreur : ${error.message}</p>`
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

        // Création de la ligne pour chaque date
        const div = document.createElement('div')
        div.className = `flex items-center justify-between p-3 border rounded-xl text-sm ${isActif ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`
        
        div.innerHTML = `
            <div>
                <p class="font-medium ${isActif ? 'text-slate-900' : 'text-slate-500 line-through'}">${dateFormatee}</p>
                <p class="text-xs ${isActif ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}">
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
        `
        listeVendredis.appendChild(div)
    })

    // Ajouter l'événement sur les boutons Masquer / Réactiver
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
            else chargerSessionsAdmin() // Recharger la liste
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
