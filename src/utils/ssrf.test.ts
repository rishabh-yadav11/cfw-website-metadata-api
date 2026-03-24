import { describe, it, expect } from 'vitest'
import { isUrlAllowed } from './ssrf'

describe('isUrlAllowed', () => {
  it('allows normal urls', () => {
    expect(isUrlAllowed('https://example.com')).toBe(true)
    expect(isUrlAllowed('http://google.com')).toBe(true)
  })

  it('blocks localhost', () => {
    expect(isUrlAllowed('http://localhost')).toBe(false)
    expect(isUrlAllowed('http://localhost:8080')).toBe(false)
  })

  it('blocks 127.0.0.1', () => {
    expect(isUrlAllowed('http://127.0.0.1')).toBe(false)
  })

  it('blocks private IPv4', () => {
    expect(isUrlAllowed('http://10.0.0.1')).toBe(false)
    expect(isUrlAllowed('http://192.168.1.1')).toBe(false)
    expect(isUrlAllowed('http://172.16.0.1')).toBe(false)
    expect(isUrlAllowed('http://172.31.255.255')).toBe(false)
  })

  it('blocks basic IPv6', () => {
    expect(isUrlAllowed('http://[::1]')).toBe(false)
    expect(isUrlAllowed('http://[fc00::]')).toBe(false)
    expect(isUrlAllowed('http://[fd00::]')).toBe(false)
    expect(isUrlAllowed('http://[fe80::]')).toBe(false)
  })

  it('blocks invalid urls', () => {
    expect(isUrlAllowed('not-a-url')).toBe(false)
  })
})
