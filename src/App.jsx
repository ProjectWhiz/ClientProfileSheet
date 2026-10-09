import { useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const SERVICE_GROUPS = [
  {
    title: 'Agency Services',
    items: [
      'Marketing Consulting',
      'Strategic Consulting',
      'Campaign Development',
      'Branding / Logo Design / Imaging / Labeling',
      'Product Design / Layout',
      'Event Planning',
    ],
  },
  {
    title: 'Media & Advertising',
    items: ['Basic Editorial Services', 'Bio Photo Sheet(s)', 'Media Kit'],
  },
  {
    title: 'Trade Shows & Events',
    items: [
      'Banner and Sign Printing Tradeshow',
      'Display - Printing Event Planning',
      'Public',
      'Private',
    ],
  },
  {
    title: 'Web & Media Production',
    items: [
      'Basic Web',
      'Business Web',
      'E-Commerce',
      'Social Media',
      'Web - Design',
      'Web Hosting / Domain',
      'Setup Payment Portals',
      'Training',
    ],
  },
  {
    title: 'Graphics, Photo & Printing',
    items: [
      'Photography',
      'Graphic Design',
      'Brochures',
      'Invoices',
      'Newsletter',
      'Business Cards',
      'Postcards',
      'Logo',
      'Stationery',
      'Catalog',
      'Posters',
      'Door Hangers',
      'Envelopes',
      'Large Photo Prints',
      'Black Ink Copies',
      'Color Ink Copies',
      'Magazine/Newspaper Ad',
      'Book Mark',
      'Letterhead',
      'Tickets',
      'Banners',
      'Coupons',
      'Application',
      'Badges',
      'Canvas',
      'Magnetic Sign',
    ],
  },
  {
    title: 'Promotional & Specialty Items',
    items: [
      'Bags',
      'Embroidery',
      'T-Shirts',
      'Car Wrap',
      'Trophy Presentation',
      'Folders Promotional',
      'Box',
      'Plaques',
      'Stickers',
      'Window Decal Sign',
      'Pens',
      'Yard Sign',
      'Invitations',
      'Mouse Pad',
      'LED Badges',
      'Pads',
      'Calendar',
      'Shirts',
      'Cups',
    ],
  },
  {
    title: 'Business Startup & Support',
    items: [
      'Business Plan Writing & Operations',
      'Proposal Writing',
      'Sponsorship Package & Research',
      'Software Updates',
      'File DBA, Incorporation, BBB, Tax ID',
      'Project Manager',
      'Office Support',
      'Grant Writing',
    ],
  },
  {
    title: 'Sales, Fundraiser / Programs',
    items: ['Setup Reseller / Affiliate Program', 'Setup Fundraiser Program'],
  },
  {
    title: 'Data Management',
    items: [
      'Data Entry',
      'PDF Creation',
      'Setup Google Doc / Cloud',
      'Computerized Form / Spreadsheet Creation',
    ],
  },
  {
    title: 'Audio & Computer Services',
    items: [
      'Comp Repair',
      'Computer Training',
      'Computer Networking',
      'Computer Certification',
      'Upgrade',
    ],
  },
  {
    title: 'Direct Mail & Bar Code',
    items: ['Bulk Mail List', 'Mailing Labels', 'QR Code'],
  },
]

const initialFormState = {
  dateCreated: new Date().toISOString().slice(0, 10),
  salesRep: '',
  marketingRep: '',
  graphicsItRep: '',
  companyName: '',
  industry: '',
  organizationType: '',
  contactName: '',
  marketingContact: '',
  marketingPhone: '',
  purchasingContact: '',
  purchasingPhone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  officePhone: '',
  fax: '',
  mobile: '',
  website: '',
  email: '',
  consultationDate: '',
  basicNeedsGoals: '',
  neededByFirst: '',
  noteFirst: '',
  primaryNeed: '',
  neededBySecond: '',
  noteSecond: '',
}

function App() {
  const [form, setForm] = useState(initialFormState)
  const [serviceSelections, setServiceSelections] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState({ type: '', message: '' })

  const hasConfig = hasSupabaseConfig()

  const totalSelectedServices = useMemo(
    () => Object.values(serviceSelections).filter(Boolean).length,
    [serviceSelections],
  )

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleServiceToggle = (event) => {
    const { name, checked } = event.target
    setServiceSelections((previous) => ({ ...previous, [name]: checked }))
  }

  const resetForm = () => {
    setForm({ ...initialFormState, dateCreated: new Date().toISOString().slice(0, 10) })
    setServiceSelections({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!hasConfig || !supabase) {
      setSubmitResult({
        type: 'error',
        message:
          'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      })
      return
    }

    const selectedServices = Object.entries(serviceSelections)
      .filter(([, checked]) => checked)
      .map(([service]) => service)

    const payload = {
      ...form,
      selectedServices,
      submittedAt: new Date().toISOString(),
    }

    setIsSubmitting(true)
    setSubmitResult({ type: '', message: '' })

    try {
      const { data, error } = await supabase.functions.invoke('submit-client-profile', {
        body: payload,
      })

      if (error) {
        throw new Error(error.message)
      }

      setSubmitResult({
        type: 'success',
        message: data?.message || 'Profile submitted and sent to service@1ststepbranding.com.',
      })
      resetForm()
    } catch (error) {
      setSubmitResult({
        type: 'error',
        message:
          error.message ||
          'Something went wrong while submitting this profile. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="bg-shape bg-shape-left" aria-hidden="true"></div>
      <div className="bg-shape bg-shape-right" aria-hidden="true"></div>

      <form className="client-form" onSubmit={handleSubmit}>
        <header className="form-header">
          <div>
            <p className="brand-name">1st Step Branding</p>
           {/* <p className="brand-phone">254-258-7507</p> */}
          </div>
          <h1>Client Profile Form</h1>
          {/* <p className="deposit-note">
            50% deposit or full payment is required before placing order or starting services.
          </p> */}
        </header>

        <section className="panel">
          <h2>Customer Information</h2>
          <div className="grid three">
            <label>
              Sales Rep#
              <input name="salesRep" value={form.salesRep} onChange={handleFieldChange} />
            </label>
            <label>
              Marketing Rep#
              <input
                name="marketingRep"
                value={form.marketingRep}
                onChange={handleFieldChange}
              />
            </label>
            <label>
              Graphics/IT Rep#
              <input
                name="graphicsItRep"
                value={form.graphicsItRep}
                onChange={handleFieldChange}
              />
            </label>
          </div>

          <div className="grid two">
            <label>
              Company Name
              <input name="companyName" value={form.companyName} onChange={handleFieldChange} />
            </label>
            <label>
              Date Created
              <input
                type="date"
                name="dateCreated"
                value={form.dateCreated}
                onChange={handleFieldChange}
              />
            </label>
          </div>

          <div className="grid two">
            <label>
              Industry
              <input name="industry" value={form.industry} onChange={handleFieldChange} />
            </label>
            <fieldset>
              <legend>Organization Type</legend>
              <div className="inline-options">
                {['Non-Profit', 'Small Biz', 'Corp'].map((type) => (
                  <label key={type} className="option-pill">
                    <input
                      type="radio"
                      name="organizationType"
                      value={type}
                      checked={form.organizationType === type}
                      onChange={handleFieldChange}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid two">
            <label>
              Contact Name
              <input name="contactName" value={form.contactName} onChange={handleFieldChange} />
            </label>
            <div></div>
          </div>

          <div className="grid two">
            <label>
              Marketing Contact
              <input
                name="marketingContact"
                value={form.marketingContact}
                onChange={handleFieldChange}
              />
            </label>
            <label>
              Phone
              <input
                name="marketingPhone"
                value={form.marketingPhone}
                onChange={handleFieldChange}
              />
            </label>
          </div>

          <div className="grid two">
            <label>
              Purchasing Contact
              <input
                name="purchasingContact"
                value={form.purchasingContact}
                onChange={handleFieldChange}
              />
            </label>
            <label>
              Phone
              <input
                name="purchasingPhone"
                value={form.purchasingPhone}
                onChange={handleFieldChange}
              />
            </label>
          </div>

          <label>
            Address
            <input name="address" value={form.address} onChange={handleFieldChange} />
          </label>

          <div className="grid three">
            <label>
              City
              <input name="city" value={form.city} onChange={handleFieldChange} />
            </label>
            <label>
              State
              <input name="state" value={form.state} onChange={handleFieldChange} />
            </label>
            <label>
              Zip
              <input name="zip" value={form.zip} onChange={handleFieldChange} />
            </label>
          </div>

          <div className="grid three">
            <label>
              Office#
              <input name="officePhone" value={form.officePhone} onChange={handleFieldChange} />
            </label>
            <label>
              Fax#
              <input name="fax" value={form.fax} onChange={handleFieldChange} />
            </label>
            <label>
              Mobile#
              <input name="mobile" value={form.mobile} onChange={handleFieldChange} />
            </label>
          </div>

          <div className="grid two">
            <label>
              Website
              <input name="website" value={form.website} onChange={handleFieldChange} />
            </label>
            <label>
              E-Mail
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFieldChange}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>Office Use Only</h2>
          <div className="grid two">
            <label>
              Business Assessment / Consultation Date
              <input
                type="date"
                name="consultationDate"
                value={form.consultationDate}
                onChange={handleFieldChange}
              />
            </label>
            <div></div>
          </div>

          <label>
            Basic Needs / Goals
            <textarea
              name="basicNeedsGoals"
              value={form.basicNeedsGoals}
              onChange={handleFieldChange}
              rows={3}
            />
          </label>

          <div className="grid two">
            <label>
              Needed By
              <input
                name="neededByFirst"
                value={form.neededByFirst}
                onChange={handleFieldChange}
              />
            </label>
            <label>
              Note
              <input name="noteFirst" value={form.noteFirst} onChange={handleFieldChange} />
            </label>
          </div>

          <label>
            Primary / Current Need
            <input name="primaryNeed" value={form.primaryNeed} onChange={handleFieldChange} />
          </label>

          <div className="grid two">
            <label>
              Needed By
              <input
                name="neededBySecond"
                value={form.neededBySecond}
                onChange={handleFieldChange}
              />
            </label>
            <label>
              Note
              <input name="noteSecond" value={form.noteSecond} onChange={handleFieldChange} />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading-row">
            <h2>Service Checklist</h2>
            <p>{totalSelectedServices} selected</p>
          </div>
          <div className="services-grid">
            {SERVICE_GROUPS.map((group) => (
              <section key={group.title} className="service-card">
                <h3>{group.title}</h3>
                <div className="checkbox-list">
                  {group.items.map((service) => (
                    <label key={service} className="checkbox-item">
                      <input
                        type="checkbox"
                        name={service}
                        checked={Boolean(serviceSelections[service])}
                        onChange={handleServiceToggle}
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="panel submit-panel">
          {!hasConfig ? (
            <p className="warning-banner">
              Supabase environment variables are missing. Add VITE_SUPABASE_URL and
              VITE_SUPABASE_ANON_KEY in .env before submitting.
            </p>
          ) : null}

          {submitResult.message ? (
            <p className={`submit-message ${submitResult.type}`}>{submitResult.message}</p>
          ) : null}

          <div className="button-row">
            <button type="button" className="secondary" onClick={resetForm}>
              Reset
            </button>
            <button type="submit" className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Client Profile'}
            </button>
          </div>
        </section>
      </form>
    </main>
  )
}

export default App
