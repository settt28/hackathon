namespace ElNino.Core.Entities;

/// <summary>Tipo de peligro natural o sanitario.</summary>
public enum HazardType
{
    Huaico,
    Inundacion,
    LluviaIntensa,
    Deslizamiento,
    Dengue,
    Epidemia,
    Marejada,
    Otro,
}

/// <summary>Momento del evento al que aplica un consejo preventivo.</summary>
public enum EventPhase { Antes, Durante, Despues }

/// <summary>Gravedad detectada por el triaje del chatbot.</summary>
public enum TriageLevel { Leve, Moderado, Grave }

/// <summary>Tipo de emergencia: define a qué número llamar.</summary>
public enum EmergencyType
{
    /// <summary>Emergencia médica → SAMU 106.</summary>
    Medica,

    /// <summary>Huaico, inundación, derrumbe → Bomberos 116.</summary>
    Desastre,
}

/// <summary>Uso de una zona geográfica.</summary>
public enum ZoneType { Riesgo, Segura }
