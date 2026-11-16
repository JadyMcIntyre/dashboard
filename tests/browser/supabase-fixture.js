(() => {
  const staff = { user: { id: 'test-advisor' } };
  let onAuthState;
  const data = {
    staff_profiles: { display_name: 'Alex', role: 'advisor' },
    company_email_contacts: [{ id: 1, label: 'Intake support', email: 'intake@example.test' }],
    advisor_roster: [
      { id: 1, name: 'Alex', user_id: 'test-advisor', advisor_weekly_hours: [{ weekday: 1, starts_at: '08:30', ends_at: '17:30' }] },
      { id: 2, name: 'Morgan', user_id: 'test-colleague', advisor_weekly_hours: [{ weekday: 1, starts_at: '10:00', ends_at: '19:00' }] }
    ],
    organization_contacts: {
      fax: '212-555-0100', website_url: 'https://renue.example.test',
      carecredit_url: 'https://carecredit.example.test', advance_care_url: 'https://advance-care.example.test',
      access_a_ride_url: 'https://transport.example.test', access_a_ride_phone: '212-555-0101'
    },
    clinic_contacts: [['NY', 'New Hyde Park'], ['CHELSEA', 'Chelsea'], ['NJ', 'Paramus'], ['FL', 'Crestview']]
      .map(([clinic_id, name], index) => ({ clinic_id, name, address: '100 Example Avenue, ' + name, phone: '212-555-010' + (index + 2) }))
  };
  window.supabase = {
    createClient: () => ({
      auth: {
        onAuthStateChange(callback) {
          onAuthState = callback;
          queueMicrotask(() => callback('INITIAL_SESSION', null));
        },
        async signInWithPassword() {
          onAuthState('SIGNED_IN', staff);
          return { error: null };
        },
        async signOut() {
          onAuthState('SIGNED_OUT', null);
          return { error: null };
        }
      },
      from(table) {
        const response = { data: data[table] || [], error: null };
        const query = {
          select: () => query, eq: () => query, order: () => query,
          is: () => query, in: () => query, neq: () => query, upsert: () => query, or: () => query,
          maybeSingle: async () => response,
          single: async () => response,
          then: (resolve, reject) => Promise.resolve(response).then(resolve, reject)
        };
        return query;
      },
      async rpc() { return { data: null, error: null }; }
    })
  };
})();
