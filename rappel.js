const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

async function envoyerRappels() {
    console.log("🚀 Démarrage du script de rappel...")

    // 1. Trouver le vendredi actif le plus proche
    const { data: sessions, error: errorSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('statut', 'actif')
        .order('date_evenement', { ascending: true })
        .limit(1)

    if (errorSession || !sessions || sessions.length === 0) {
        console.log("ℹ️ Aucune session active programmée à venir. Fin du script.")
        return
    }

    const prochaineSession = sessions[0]
    const dateObj = new Date(prochaineSession.date_evenement)
    const dateFormatee = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    // 2. Récupérer les parents inscrits pour cette session
    const { data: inscriptions, error: errorInscriptions } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('session_id', prochaineSession.id)

    if (errorInscriptions || !inscriptions || inscriptions.length === 0) {
        console.log(`ℹ️ Aucun inscrit pour la session du ${dateFormatee}.`)
        return
    }

    console.log(`📋 ${inscriptions.length} inscription(s) trouvée(s) pour le ${dateFormatee}. Préparation des e-mails...`)

    // 3. Regrouper les rôles par parent (au cas où un parent fait gâteau ET vente)
    const parentsMap = {}
    inscriptions.forEach(ins => {
        const email = ins.contact.toLowerCase().trim()
        if (!parentsMap[email]) {
            parentsMap[email] = { nom: ins.nom_parent, roles: [] }
        }
        parentsMap[email].roles.push(ins.role)
    })

    // 4. Envoyer un e-mail personnalisé à chaque parent
    for (const [email, info] of Object.entries(parentsMap)) {
        const listeRolesText = info.roles.map(r => r === 'gateau' ? '🍰 Préparer un délicieux gâteau' : '🏪 Venir aider à la vente (16h20 - 16h50)').join('<br>• ')

        try {
            const data = await resend.emails.send({
                from: 'Vendredi Gouter <onboarding@resend.dev>', // Sera remplacé si tu configures ton propre domaine
                to: email,
                subject: `🍰 Rappel : Votre inscription pour le Goûter de demain !`,
                html: `
                    <div style="font-family: sans-serif; color: #334155; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-key: 12px;">
                        <h2 style="color: #f59e0b; margin-top: 0;">Bonjour ${info.nom},</h2>
                        <p>C'est un petit rappel de l'association des parents d'élèves. Vous êtes inscrit(e) demain (<strong>${dateFormatee}</strong>) pour le Vendredi Goûter :</p>
                        <p style="background-color: #fef3c7; padding: 12px; border-radius: 8px; margin: 15px 0; font-weight: 500;">
                            • ${listeRolesText}
                        </p>
                        <p>Les enfants vous remercient chaleureusement pour votre aide précieuse ! 🎉</p>
                        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                        <p style="font-size: 11px; color: #94a3b8; text-align: center;">À demain à la sortie de l'école !</p>
                    </div>
                `
            })
            console.log(`✅ E-mail envoyé avec succès à : ${email}`)
        } catch (err) {
            console.error(`❌ Échec de l'envoi pour ${email}:`, err)
        }
    }
    console.log("🏁 Script terminé.")
}

envoyerRappels()
