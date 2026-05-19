// 1. Importation du SDK Supabase depuis le CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// 2. Configuration (Remplace avec TES propres identifiants Supabase)
const SUPABASE_URL = 'https://vdetqssagjdlvpffmorp.supabase.co/rest/v1/'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZXRxc3NhZ2pkbHZwZmZtb3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODQyNDUsImV4cCI6MjA5NDc2MDI0NX0.kMmilrlCcQP8qLy76ClvwfsHY774iLxJjGOfT8tQsNg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 3. Ciblage des éléments HTML
const selectDate = document.getElementById('select-date')
const sectionBesoins = document.getElementById('section-besoins')
const jaugeGateaux = document.getElementById('jauge-gateaux')
const jaugeVendeurs = document.getElementById('jauge-vendeurs')
const formInscription = document.getElementById('form-inscription')
const labelRoleGateau = document.getElementById('label-role-gateau')
const labelRoleVente = document.getElementById('label-role-vente')
const messageComplet = document.getElementById('message-complet')

let sessionsActives = []

// 4. Initialisation : Charger les vendredis au démarrage
async function init() {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('statut', 'actif')
        .order('date_evenement', { ascending: true })

    if (error) {
        console.error("Erreur de chargement des sessions:", error.message)
        selectDate.innerHTML = '<option>Erreur de chargement...</option>'
        return
    }

    sessionsActives = data
    
    // Remplir le menu déroulant
    selectDate.innerHTML = '<option value="">-- Sélectionnez une date --</option>'
    sessionsActives.forEach(session => {
        // Formatage de la date en français (ex: 22/05)
        const dateObj = new Date(session.date_evenement)
        const dateFormatee = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })
        
        const option = document.createElement('option')
        option.value = session.id
        option.textContent = `Vendredi ${dateFormatee}`
        selectDate.appendChild(option)
    })
}

// 5. Gérer le changement de date
selectDate.addEventListener('change', async (e) => {
    const sessionId = e.target.value
    if (!sessionId) {
        sectionBesoins.classList.add('hidden')
        formInscription.classList.add('hidden')
        return
    }

    // Trouver les infos de la session sélectionnée
    const session = sessionsActives.find(s => s.id === sessionId)

    // Récupérer les inscriptions déjà existantes pour ce vendredi
    const { data: inscriptions, error } = await supabase
        .from('inscriptions')
        .select('role')
        .eq('session_id', sessionId)

    if (error) {
        console.error("Erreur de récupération des inscriptions:", error.message)
        return
    }

    // Calculer le nombre actuel de gâteaux et vendeurs inscrits
    const nbGateaux = inscriptions.filter(i => i.role === 'gateau').length
    const nbVendeurs = inscriptions.filter(i => i.role === 'vente').length

    // Mettre à jour l'affichage des jauges
    jaugeGateaux.textContent = `${nbGateaux} / ${session.max_gateaux}`
    jaugeVendeurs.textContent = `${nbVendeurs} / ${session.max_vendeurs}`
    sectionBesoins.classList.remove('hidden')

    // Gérer la disponibilité des rôles (cacher ou afficher si complet)
    const gateauComplet = nbGateaux >= session.max_gateaux
    const venteComplete = nbVendeurs >= session.max_vendeurs

    if (gateauComplet) labelRoleGateau.classList.add('hidden')
    else labelRoleGateau.classList.remove('hidden')

    if (venteComplete) labelRoleVente.classList.add('hidden')
    else labelRoleVente.classList.remove('hidden')

    // Afficher le formulaire ou le message "complet"
    if (gateauComplet && venteComplete) {
        formInscription.classList.add('hidden')
        messageComplet.classList.remove('hidden')
    } else {
        formInscription.classList.remove('hidden')
        messageComplet.classList.add('hidden')
        
        // Cocher par défaut l'option disponible
        if (gateauComplet) document.querySelector('input[value="vente"]').checked = true
        else document.querySelector('input[value="gateau"]').checked = true
    }
})

// 6. Soumission du formulaire (Inscription du parent)
formInscription.addEventListener('submit', async (e) => {
    e.preventDefault()

    const sessionId = selectDate.value
    const nom = document.getElementById('input-nom').value.trim()
    const contact = document.getElementById('input-contact').value.trim()
    const role = document.querySelector('input[name="role"]:checked').value

    // Envoyer les données à Supabase
    const { error } = await supabase
        .from('inscriptions')
        .insert([{ session_id: sessionId, nom_parent: nom, contact: contact, role: role }])

    if (error) {
        alert("Oups, une erreur est survenue lors de l'inscription : " + error.message)
    } else {
        alert(`Merci ${nom} ! 🎉 Votre inscription a bien été enregistrée.`)
        formInscription.reset()
        // Déclencher un rafraîchissement des jauges pour la date actuelle
        selectDate.dispatchEvent(new Event('change'))
    }
})

// Lancement au chargement de la page
init()
