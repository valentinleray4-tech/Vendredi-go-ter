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

// Création dynamique de la case à cocher pour l'historique
const divOutils = document.createElement('div')
divOutils.className = "flex items-center space-x-2 pb-2 border-b border-slate-100"
divOutils.innerHTML = `
    <input type="checkbox" id="check-historique" class="h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-500">
    <label for="check-historique" class="text-xs font-medium text-slate-600 cursor-pointer select-none">
        🕒 Afficher l'historique des dates passées
    </label>
`
listeVendredis.parentNode.insertBefore(divOutils, listeVendredis)
const checkHistorique = document.getElementById('check-historique')

// Écouter le clic sur la case historique pour rafraîchir la liste
checkHistorique.addEventListener('change', chargerSessionsAdmin)

// Charger et afficher la liste des vendredis avec filtre intelligent
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
    
    // Calcul de la date du jour à minuit pour la comparaison
    const aujourdHui = new Date()
    aujourdHui.setHours(0, 0, 0, 0)

    let auMoinsUneSessionAffichee = false

    sessions.forEach(session => {
        const dateObj = new Date(session.date_evenement)
        dateObj.setHours(0, 0, 0, 0)
        
        const estPassee = dateObj < aujourdHui
        const isActif = session.statut === 'actif'

        // FILTRE : Si la date est passée ET que la case "Historique" n'est pas cochée, on la masque !
        if (estPassee && !checkHistorique.checked) {
            return 
        }

        auMoinsUneSessionAffichee = true

        // Filtrer les inscriptions pour CE vendredi précis
        const inscritsDuJour = inscriptions.filter(i => i.session_id === session.id)
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

        const dateFormatee = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

        // Style différent pour les sessions passées
        let styleStatut = isActif ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'
        let texteStatut = isActif ? '● Affiché aux parents' : '❌ Masqué (Vacances/Férié)'
        let bgStyle = isActif ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'

        if (estPassee) {
            styleStatut = 'text-slate-400 font-medium'
            texteStatut = '⏳ Date passée (Archivée)'
            bgStyle = 'bg-slate-100/70 border-slate-200 opacity-70'
        }

        // Création du bloc HTML
        const div = document.createElement('div')
        div.className = `p-4 border rounded-xl text-sm ${bgStyle}`
        
        div.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <p class="font-semibold text-base ${isActif && !estPassee ? 'text-slate-900' : 'text-slate-500 line-through'}">${dateFormatee}</p>
                    <p class="text-xs ${styleStatut} mt-0.5">${texteStatut}</p>
                </div>
                ${!estPassee ? `
                    <button class="btn-toggle text-xs font-semibold px-3 py-1.5 rounded-lg border transition shadow-sm ${
                        isActif 
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                    }" data-id="${session.id}" data-statut="${session.statut}">
                        ${isActif ? 'Masquer' : 'Réactiver'}
                    </button>
                ` : '<span class="text-xs text-slate-400 italic bg-slate-200/50 px-2 py-1 rounded-md">Verrouillé</span>'}
            </div>
            ${isActif || estPassee ? htmlRecap : ''} 
        `
        listeVendredis.appendChild(div)
    })

    if (!auMoinsUneSessionAffichee) {
        listeVendredis.innerHTML = `<p class="text-sm text-slate-400 italic pt-2">Aucun vendredi à venir programmé.</p>`
    }

    // Événement sur les boutons Masquer / Réactiver (uniquement pour les dates futures)
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
